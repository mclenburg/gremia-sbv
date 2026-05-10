import { basename } from 'node:path';
import { readFileSync } from 'node:fs';
import type { DatabaseAdapter } from './databaseService.js';
import { ProtectedPersonService } from './protectedPersonService.js';
import { resolvePersonImportMatch } from './personMatchingService.js';
import {
  getMappedValue,
  normalizeCell,
  normalizeDateString,
  normalizeProtectionStatus,
  parseDelimitedText,
  parseXlsxFile,
  sha256Text,
  splitFullName
} from './personImportParsing.js';
import type {
  CreateProtectedPersonInput,
  PersonImportColumnMapping,
  PersonImportExecuteInput,
  PersonImportExecuteResult,
  PersonImportPreviewInput,
  PersonImportPreviewResult,
  PersonImportPreviewRow,
  ProtectedPersonRecord,
  UpdateProtectedPersonInput
} from '../src/app/core/models/protected-person.model.js';

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

function buildPersonInput(rowObject: Record<string, string>, mapping: PersonImportColumnMapping): { input: CreateProtectedPersonInput; validationErrors: string[]; rawPreview: Record<string, string> } {
  const fullName = getMappedValue(rowObject, 'fullName', mapping);
  const split = fullName ? splitFullName(fullName, mapping.fullNameMode) : { firstName: '', lastName: '' };
  const firstName = normalizeCell(getMappedValue(rowObject, 'firstName', mapping) ?? split.firstName);
  const lastName = normalizeCell(getMappedValue(rowObject, 'lastName', mapping) ?? split.lastName);
  const protectionStatus = normalizeProtectionStatus(getMappedValue(rowObject, 'protectionStatus', mapping));
  const employmentStateRaw = normalizeCell(getMappedValue(rowObject, 'employmentState', mapping)).toLowerCase();
  const leftCompanyAt = normalizeDateString(getMappedValue(rowObject, 'leftCompanyAt', mapping));
  const employmentState: CreateProtectedPersonInput['employmentState'] = leftCompanyAt || /ausgeschieden|ende|left|inaktiv/.test(employmentStateRaw) ? 'left_company' : 'active_employee';
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
    protectionStatus,
    statusValidFrom: normalizeDateString(getMappedValue(rowObject, 'statusValidFrom', mapping)),
    statusValidUntil: normalizeDateString(getMappedValue(rowObject, 'statusValidUntil', mapping)),
    evidenceCheckedAt: normalizeDateString(getMappedValue(rowObject, 'evidenceCheckedAt', mapping)),
    statusSource: 'employer_list',
    notes: normalizeCell(getMappedValue(rowObject, 'notes', mapping)) || undefined
  };
  const validationErrors: string[] = [];
  if (!input.firstName) validationErrors.push('Vorname fehlt. Bei Vollnamen-Spalten ggf. Modus Vorname Nachname oder Nachname, Vorname wählen.');
  if (!input.lastName) validationErrors.push('Nachname fehlt.');
  if (!mapping.firstName && !mapping.lastName && !mapping.fullName) validationErrors.push('Mapping unvollständig: Name muss über getrennte Spalten oder eine Vollnamen-Spalte zugeordnet werden.');
  if (!mapping.protectionStatus) validationErrors.push('Mapping unvollständig: Schutzstatus ist erforderlich.');
  return { input, validationErrors, rawPreview: Object.fromEntries(Object.entries(rowObject).filter(([key]) => !key.toLowerCase().includes('gdb')).slice(0, 12)) };
}

function diffPerson(existing: ProtectedPersonRecord, next: CreateProtectedPersonInput): { changed: string[]; update: UpdateProtectedPersonInput } {
  const update: UpdateProtectedPersonInput = {};
  const changed: string[] = [];
  const keys: (keyof CreateProtectedPersonInput)[] = [
    'firstName', 'lastName', 'personnelNumber', 'workEmail', 'organizationalUnit', 'location',
    'employmentState', 'leftCompanyAt', 'leftCompanyReason', 'protectionStatus', 'statusValidFrom',
    'statusValidUntil', 'evidenceCheckedAt', 'statusSource', 'notes'
  ];
  keys.forEach((key) => {
    const existingValue = existing[key as keyof ProtectedPersonRecord] ?? '';
    const nextValue = next[key] ?? '';
    if (existingValue !== nextValue) {
      (update as any)[key] = nextValue || undefined;
      changed.push(String(key));
    }
  });
  return { changed, update };
}

export class PersonImportService {
  constructor(private readonly db: DatabaseAdapter) {}

  async readRows(input: PersonImportPreviewInput): Promise<{ rows: string[][]; sourceTextHash: string; columns: string[]; objects: Record<string, string>[] }> {
    const headerRowIndex = input.headerRowIndex ?? 0;
    const fileType = input.fileType;
    let rows: string[][];
    let sourceHash: string;
    if (fileType === 'xlsx') {
      if (!input.filePath) throw new Error('XLSX-Import benötigt einen Dateipfad.');
      const parsed = await parseXlsxFile(input.filePath, input.sheetName);
      rows = parsed.rows;
      sourceHash = sha256Text(readFileSync(input.filePath).toString('base64'));
    } else {
      const text = input.csvText ?? (input.filePath ? readFileSync(input.filePath, 'utf8') : '');
      rows = parseDelimitedText(text, input.delimiter ?? ';');
      sourceHash = sha256Text(text);
    }
    const { columns, objects } = rowsToObjects(rows, headerRowIndex);
    return { rows, sourceTextHash: sourceHash, columns, objects };
  }

  async preview(input: PersonImportPreviewInput): Promise<PersonImportPreviewResult> {
    const { columns, objects } = await this.readRows(input);
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
        validationErrors: mapped.validationErrors,
        rawPreview: mapped.rawPreview
      };
    });
    const warnings: string[] = [];
    if (columns.some((column) => /\bgdb\b|grad der behinderung/i.test(column))) warnings.push('Eine GdB-Spalte wurde erkannt. Sie wird aus Gründen der Datensparsamkeit nicht importiert, solange sie nicht ausdrücklich gemappt wird.');
    if (!input.mapping.personnelNumber) warnings.push('Personalnummer ist optional. Ohne Personalnummer erfolgt der sichere Abgleich ersatzweise über dienstliche E-Mail; Name/Vorname erzeugt nur Konflikte.');
    return { columns, rows, warnings };
  }

  async execute(input: PersonImportExecuteInput): Promise<PersonImportExecuteResult> {
    const personService = new ProtectedPersonService(this.db);
    const { objects, sourceTextHash } = await this.readRows(input);
    const firstDataIndex = input.firstDataRowIndex ?? 1;
    const items: any[] = [];
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

      const diff = diffPerson(existing, mapped.input);
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
      missingCount: 0,
      items
    });

    return { run, imported };
  }
}
