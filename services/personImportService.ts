import { basename } from 'node:path';
import { readFileSync } from 'node:fs';
import type { DatabaseAdapter } from './databaseService.js';
import { ProtectedPersonService } from './protectedPersonService.js';
import { DeadlineService } from './deadlineService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { resolvePersonImportMatch } from './personMatchingService.js';
import {
  getMappedValue,
  normalizeCell,
  normalizeDateString,
  parseDelimitedText,
  parseXlsxFile,
  sha256Text,
  assertPersonImportFileSize,
  MAX_PERSON_IMPORT_FILE_BYTES,
  MAX_PERSON_IMPORT_ROWS,
  splitFullName
} from './personImportParsing.js';
import { resolvePersonImportStatus } from './personImportStatusResolver.js';
import { decodeCp850, detectCsvEncoding, type CsvEncodingDetectionResult } from './csvEncodingDetection.js';
import type {
  CreateProtectedPersonInput,
  PersonImportColumnMapping,
  PersonImportExecuteInput,
  PersonImportExecuteResult,
  PersonImportPreviewInput,
  PersonImportPreviewResult,
  PersonImportPreviewRow,
  PersonImportRunItemRecord,
  ProtectedPersonRecord,
  UpdateProtectedPersonInput
} from '../src/domain/models/protected-person.model.js';
import { legalToday } from '../src/domain/time/legalTime.js';

function rowsToObjects(rows: string[][], headerRowIndex: number): { columns: string[]; objects: Record<string, string>[] } {
  const header = rows[headerRowIndex] ?? [];
  const columns = header.map((value, index) => normalizeCell(value) || `Spalte ${index + 1}`);
  const objects = rows.slice(headerRowIndex + 1).map((row) => {
    const object: Record<string, string> = {};
    columns.forEach((column, index) => {
      object[column] = normalizeCell(row[index]);
      object[column.toLowerCase()] = normalizeCell(row[index]);
    });
    return object;
  });
  return { columns, objects };
}

function isPastOrToday(value: string | undefined): boolean {
  return Boolean(value) && value! <= legalToday();
}

function mappedImportDate(rowObject: Record<string, string>, mapping: PersonImportColumnMapping, key: 'leftCompanyAt' | 'statusValidFrom' | 'statusValidUntil' | 'evidenceCheckedAt', validationErrors: string[]): string | undefined {
  const raw = getMappedValue(rowObject, key, mapping);
  const date = normalizeDateString(raw);
  if (normalizeCell(raw) && !date) validationErrors.push(`Ungültiges Datum in „${mapping[key]}“. Bitte die Importzeile prüfen.`);
  return date;
}

export function buildPersonInput(rowObject: Record<string, string>, mapping: PersonImportColumnMapping): { input: CreateProtectedPersonInput; validationErrors: string[]; rawPreview: Record<string, string>; statusReason: string; statusWarnings: string[] } {
  const fullName = getMappedValue(rowObject, 'fullName', mapping);
  const split = fullName ? splitFullName(fullName, mapping.fullNameMode) : { firstName: '', lastName: '' };
  const firstName = normalizeCell(getMappedValue(rowObject, 'firstName', mapping) ?? split.firstName);
  const lastName = normalizeCell(getMappedValue(rowObject, 'lastName', mapping) ?? split.lastName);
  const statusResolution = resolvePersonImportStatus(rowObject, mapping);
  const validationErrors: string[] = [...statusResolution.validationErrors];
  const employmentStateRaw = normalizeCell(getMappedValue(rowObject, 'employmentState', mapping)).toLowerCase();
  const leftCompanyAt = mappedImportDate(rowObject, mapping, 'leftCompanyAt', validationErrors);
  const rawIndicatesLeft = /ausgeschieden|ende|left|inaktiv/.test(employmentStateRaw);
  const employmentState: CreateProtectedPersonInput['employmentState'] = employmentStateRaw || leftCompanyAt
    ? isPastOrToday(leftCompanyAt) || (rawIndicatesLeft && !leftCompanyAt) ? 'left_company' : 'active_employee'
    : undefined;
  const input: CreateProtectedPersonInput = {
    firstName,
    lastName,
    personnelNumber: normalizeCell(getMappedValue(rowObject, 'personnelNumber', mapping)) || undefined,
    workEmail: normalizeCell(getMappedValue(rowObject, 'workEmail', mapping)) || undefined,
    organizationalUnit: normalizeCell(getMappedValue(rowObject, 'organizationalUnit', mapping)) || undefined,
    location: normalizeCell(getMappedValue(rowObject, 'location', mapping)) || undefined,
    employmentState,
    leftCompanyAt,
    leftCompanyReason: leftCompanyAt ? 'known_departure' : undefined,
    protectionStatus: statusResolution.protectionStatus,
    statusValidFrom: mappedImportDate(rowObject, mapping, 'statusValidFrom', validationErrors) ?? statusResolution.statusValidFrom,
    statusValidUntil: mappedImportDate(rowObject, mapping, 'statusValidUntil', validationErrors),
    evidenceCheckedAt: mappedImportDate(rowObject, mapping, 'evidenceCheckedAt', validationErrors) ?? statusResolution.evidenceCheckedAt,
    statusSource: 'employer_list',
    notes: normalizeCell(getMappedValue(rowObject, 'notes', mapping)) || undefined
  };
  if (input.statusValidFrom && input.statusValidUntil && input.statusValidFrom > input.statusValidUntil) {
    validationErrors.push('Status gültig bis liegt vor dem Statusbeginn. Bitte die Datumsangaben prüfen.');
  }
  if (!input.firstName) validationErrors.push('Vorname fehlt. Bei Vollnamen-Spalten ggf. Modus Vorname Nachname oder Nachname, Vorname wählen.');
  if (!input.lastName) validationErrors.push('Nachname fehlt.');
  if (!mapping.firstName && !mapping.lastName && !mapping.fullName) validationErrors.push('Mapping unvollständig: Name muss über getrennte Spalten oder eine Vollnamen-Spalte zugeordnet werden.');
  if (!mapping.protectionStatus && !mapping.severelyDisabledSince && !mapping.equivalentPresentedAt && !mapping.applicationFiledAt) {
    validationErrors.push('Mapping unvollständig: Schutzstatus ist über eine Statusspalte oder über Nachweis-/Antragsdatumsspalten erforderlich.');
  }
  return {
    input,
    validationErrors,
    rawPreview: Object.fromEntries(Object.entries(rowObject).filter(([key]) => !key.toLowerCase().includes('gdb')).slice(0, 12)),
    statusReason: statusResolution.reason,
    statusWarnings: statusResolution.warnings,
  };
}

function setPersonImportUpdateField<K extends keyof CreateProtectedPersonInput>(update: UpdateProtectedPersonInput, key: K, value: CreateProtectedPersonInput[K] | undefined): void {
  update[key] = value;
}

function shouldUpdateProtectionStatus(existing: ProtectedPersonRecord, next: CreateProtectedPersonInput): boolean {
  if (existing.protectionStatus === next.protectionStatus) return false;
  if (next.protectionStatus === 'unclear') return false;
  if (next.protectionStatus === 'application_pending') return existing.protectionStatus === 'unclear' || existing.protectionStatus === 'expired' || existing.protectionStatus === 'inactive';
  if (next.protectionStatus === 'expired' || next.protectionStatus === 'inactive') return existing.statusSource === 'employer_list';
  if (next.protectionStatus === 'equivalent' && existing.protectionStatus === 'severely_disabled') {
    return existing.statusSource === 'employer_list';
  }
  return true;
}

function shouldUpdateImportedField(existing: ProtectedPersonRecord, next: CreateProtectedPersonInput, key: keyof CreateProtectedPersonInput): boolean {
  const nextValue = next[key];
  if (nextValue === undefined || nextValue === '') return false;
  const existingValue = existing[key as keyof ProtectedPersonRecord];
  if ((existingValue ?? '') === nextValue) return false;
  if (key === 'notes' && existingValue) return false;
  return true;
}

export function planPersonImportUpdate(existing: ProtectedPersonRecord, next: CreateProtectedPersonInput): { changed: string[]; update: UpdateProtectedPersonInput } {
  const update: UpdateProtectedPersonInput = {};
  const changed: string[] = [];
  const keys: (keyof CreateProtectedPersonInput)[] = [
    'firstName', 'lastName', 'personnelNumber', 'workEmail', 'organizationalUnit', 'location',
    'employmentState', 'leftCompanyAt', 'leftCompanyReason', 'notes'
  ];
  keys.forEach((key) => {
    if (shouldUpdateImportedField(existing, next, key)) {
      setPersonImportUpdateField(update, key, next[key] || undefined);
      changed.push(String(key));
    }
  });
  const statusChanged = shouldUpdateProtectionStatus(existing, next);
  if (statusChanged) {
    update.protectionStatus = next.protectionStatus;
    changed.push('protectionStatus');
    if (next.statusSource && existing.statusSource !== next.statusSource) {
      update.statusSource = next.statusSource;
      changed.push('statusSource');
    }
  }
  if (statusChanged || existing.protectionStatus === next.protectionStatus && next.protectionStatus !== 'unclear') {
    for (const key of ['statusValidFrom', 'statusValidUntil', 'evidenceCheckedAt'] as const) {
      const value = next[key];
      if (!statusChanged && (!value || (key !== 'statusValidUntil' && existing.statusSource !== 'employer_list' && existing[key]))) continue;
      if (existing[key] !== value) {
        update[key] = value;
        changed.push(key);
      }
    }
  }
  return { changed, update };
}

export class PersonImportService {
  constructor(private readonly database: DatabaseAdapter) {}

  private decodeCsv(input: PersonImportPreviewInput): { text: string; hashSource: string; detection?: CsvEncodingDetectionResult } {
    if (input.csvText !== undefined) {
      if (Buffer.byteLength(input.csvText, 'utf8') > MAX_PERSON_IMPORT_FILE_BYTES) {
        throw new Error('CSV-Inhalt ist zu groß. Maximal 25 MB sind zulässig.');
      }
      return { text: input.csvText, hashSource: input.csvText, detection: { encoding: 'utf-8', confidence: 'high', decodedText: input.csvText, warnings: ['CSV-Zeichenkodierung: eingefügter Text wird als UTF-8 verarbeitet.'] } };
    }
    if (input.filePath) assertPersonImportFileSize(input.filePath);
    const buffer = input.filePath ? readFileSync(input.filePath) : Buffer.from('');
    const requested = input.csvEncoding && input.csvEncoding !== 'auto' ? input.csvEncoding : undefined;
    if (requested && requested !== 'cp850') {
      const text = new TextDecoder(requested, { fatal: false }).decode(buffer);
      return { text, hashSource: buffer.toString('base64'), detection: { encoding: requested, confidence: 'high', decodedText: text, warnings: [`CSV-Zeichenkodierung manuell verwendet: ${requested}.`] } };
    }
    if (requested === 'cp850') {
      const detected = detectCsvEncoding(buffer);
      const forced = { ...detected, encoding: 'cp850' as const, decodedText: decodeCp850(buffer), warnings: ['CSV-Zeichenkodierung manuell verwendet: cp850.'] };
      return { text: forced.decodedText, hashSource: buffer.toString('base64'), detection: forced };
    }
    const detection = detectCsvEncoding(buffer);
    return { text: detection.decodedText, hashSource: buffer.toString('base64'), detection };
  }

  async readRows(input: PersonImportPreviewInput): Promise<{ rows: string[][]; sourceTextHash: string; columns: string[]; objects: Record<string, string>[]; csvDetection?: CsvEncodingDetectionResult }> {
    const headerRowIndex = input.headerRowIndex ?? 0;
    const fileType = input.fileType;
    let rows: string[][];
    let sourceHash: string;
    let csvDetection: CsvEncodingDetectionResult | undefined;
    if (fileType === 'xlsx') {
      if (!input.filePath) throw new Error('XLSX-Import benötigt einen Dateipfad.');
      assertPersonImportFileSize(input.filePath);
      const parsed = await parseXlsxFile(input.filePath, input.sheetName);
      rows = parsed.rows;
      sourceHash = sha256Text(readFileSync(input.filePath).toString('base64'));
    } else {
      const decoded = this.decodeCsv(input);
      csvDetection = decoded.detection;
      rows = parseDelimitedText(decoded.text, input.delimiter ?? ';');
      if (rows.length > MAX_PERSON_IMPORT_ROWS) throw new Error(`Import enthält mehr als ${MAX_PERSON_IMPORT_ROWS} Zeilen.`);
      sourceHash = sha256Text(decoded.hashSource);
    }
    const { columns, objects } = rowsToObjects(rows, headerRowIndex);
    return { rows, sourceTextHash: sourceHash, columns, objects, csvDetection };
  }

  async preview(input: PersonImportPreviewInput): Promise<PersonImportPreviewResult> {
    const { columns, objects, csvDetection } = await this.readRows(input);
    const firstDataIndex = input.firstDataRowIndex ?? 1;
    const rows = objects.slice(Math.max(0, firstDataIndex - 1)).slice(0, 50).map((rowObject, index): PersonImportPreviewRow => {
      const mapped = buildPersonInput(rowObject, input.mapping);
      return {
        rowNumber: firstDataIndex + index + 1,
        firstName: mapped.input.firstName,
        lastName: mapped.input.lastName,
        personnelNumber: mapped.input.personnelNumber,
        workEmail: mapped.input.workEmail,
        protectionStatus: mapped.input.protectionStatus,
        statusValidUntil: mapped.input.statusValidUntil,
        statusReason: mapped.statusReason,
        statusWarnings: mapped.statusWarnings,
        validationErrors: mapped.validationErrors,
        rawPreview: mapped.rawPreview
      };
    });
    const warnings: string[] = [...(csvDetection?.warnings ?? [])];
    if (columns.some((column) => /\bgdb\b|grad der behinderung/i.test(column))) warnings.push('Eine GdB-Spalte wurde erkannt. Sie wird aus Gründen der Datensparsamkeit nicht importiert, solange sie nicht ausdrücklich gemappt wird.');
    if (!input.mapping.personnelNumber) warnings.push('Personalnummer ist optional. Ohne Personalnummer erfolgt der sichere Abgleich ersatzweise über dienstliche E-Mail; Name/Vorname erzeugt nur Konflikte.');
    return { columns, rows, warnings, detectedEncoding: csvDetection?.encoding, encodingConfidence: csvDetection?.confidence };
  }

  async execute(input: PersonImportExecuteInput): Promise<PersonImportExecuteResult> {
    const personService = new ProtectedPersonService(this.database);
    const { objects, sourceTextHash } = await this.readRows(input);
    return new DatabaseUnitOfWork(this.database).run(() => {
    const previousEmployerPersons = input.reconcileMissingPersons
      ? personService.list().filter((person) => (person.recordKind ?? 'identified_person') === 'identified_person' && person.statusSource === 'employer_list' && person.employmentState === 'active_employee' && person.lifecycleState !== 'anonymized' && person.lifecycleState !== 'deleted_marker')
      : [];
    const matchedPersonIds = new Set<string>();
    const firstDataIndex = input.firstDataRowIndex ?? 1;
    const items: Omit<PersonImportRunItemRecord, 'id' | 'runId' | 'createdAt'>[] = [];
    const imported: ProtectedPersonRecord[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let conflictCount = 0;
    let skippedCount = 0;

    for (const [index, rowObject] of objects.slice(Math.max(0, firstDataIndex - 1)).entries()) {
      const rowNumber = firstDataIndex + index + 1;
      const mapped = buildPersonInput(rowObject, input.mapping);
      if (mapped.validationErrors.length) {
        skippedCount += 1;
        items.push({ rowNumber, action: 'skipped', matchStrategy: 'none', validationMessage: mapped.validationErrors.join(' | '), changedFields: [] });
        continue;
      }

      const match = resolvePersonImportMatch(mapped.input, personService);
      const existing = match.existing;
      const matchStrategy = match.matchStrategy;

      if (match.conflict && !existing) {
        matchedPersonIds.add(match.conflict.id);
        conflictCount += 1;
        items.push({ rowNumber, action: 'conflict', protectedPersonId: match.conflict.id, matchStrategy, conflictReason: match.conflictReason, changedFields: [] });
        continue;
      }

      if (!existing) {
        const created = personService.create(mapped.input);
        imported.push(created);
        createdCount += 1;
        items.push({ rowNumber, action: 'created', protectedPersonId: created.id, matchStrategy, changedFields: ['created'] });
        continue;
      }

      matchedPersonIds.add(existing.id);
      if (existing.protectionStatus === 'severely_disabled' && mapped.input.protectionStatus === 'equivalent' && existing.statusSource !== 'employer_list') {
        conflictCount += 1;
        items.push({ rowNumber, action: 'conflict', protectedPersonId: existing.id, matchStrategy, conflictReason: 'Gleichstellung in der Arbeitgeberliste widerspricht einer anders belegten Schwerbehinderung. Schutzstatus bitte manuell prüfen.', changedFields: [] });
        continue;
      }
      new DeadlineService(this.database).cancelMissingFromEmployerListReview(existing.id);

      const diff = planPersonImportUpdate(existing, mapped.input);
      if (!diff.changed.length) {
        unchangedCount += 1;
        items.push({ rowNumber, action: 'unchanged', protectedPersonId: existing.id, matchStrategy, changedFields: [] });
      } else {
        const updated = personService.update(existing.id, diff.update);
        imported.push(updated);
        updatedCount += 1;
        items.push({ rowNumber, action: 'updated', protectedPersonId: existing.id, matchStrategy, changedFields: diff.changed });
      }
    }

    let reconciliationSkippedReason: string | undefined;
    let missingCount = 0;
    if (input.reconcileMissingPersons) {
      if (conflictCount || skippedCount || !objects.length) {
        reconciliationSkippedReason = 'Der Bestandsabgleich wurde wegen Konflikten, übersprungener Zeilen oder einer leeren Liste ausgesetzt. Bitte diese Einträge zuerst prüfen und die vollständige Liste erneut importieren.';
      } else {
        for (const person of previousEmployerPersons) {
          if (matchedPersonIds.has(person.id)) continue;
          personService.createMissingFromEmployerListReview(person.id);
          missingCount += 1;
          items.push({ rowNumber: 0, action: 'not_in_list', protectedPersonId: person.id, matchStrategy: 'none', validationMessage: 'In der bestätigten vollständigen Arbeitgeberliste nicht enthalten. Beschäftigungsstatus und weitere Speicherung manuell prüfen.', changedFields: [] });
        }
      }
    }

    const run = personService.recordImportRun({
      profileId: input.profileId,
      sourceFileName: basename(input.sourceFileName),
      sourceFileHash: sourceTextHash,
      totalRows: createdCount + updatedCount + unchangedCount + conflictCount + skippedCount,
      createdCount,
      updatedCount,
      unchangedCount,
      conflictCount,
      skippedCount,
      missingCount,
      items
    });

    return { run, imported, reconciliationSkippedReason };
    });
  }
}
