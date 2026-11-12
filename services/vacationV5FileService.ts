import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import type { TransferCapabilities } from '../src/domain/models/transfer-capability.model.js';
import type { VacationV5ScopeSelection } from '../src/domain/transfer/vacationV5ScopePolicy.js';
import { assertTransferCapabilities } from './transferCapabilityDocument.js';
import { parseTransferRecipientToken } from './transferInstanceIdentityPolicy.js';
import { TransferInstanceIdentityService } from './transferInstanceIdentityService.js';
import { collectVacationV5Sections } from './vacationV5SectionCollector.js';
import { collectVacationV5CaseSections } from './vacationV5CaseCollector.js';
import { collectVacationV5OfficeDocuments } from './vacationV5OfficeDocumentCollector.js';
import { vacationV5SourceTable, type VacationV5PackageSourceByRef } from './vacationV5PackageSource.js';
import { caseHandoverBaselineHash } from './caseHandoverBaselineHash.js';
import { sealVacationV5Transport, openVacationV5Transport, type VacationV5Payload } from './vacationV5Transport.js';
import { importVacationV5Package } from './vacationV5PackageImporter.js';
import { recordVacationV5Export } from './caseHandoverExportLedger.js';
import { writeCaseHandoverFile } from './caseHandoverAtomicFile.js';
import { CASE_HANDOVER_FILE_EXTENSION, inspectCaseHandoverFilePath } from './caseHandoverFilePolicy.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditCaseHandoverExported } from './auditEventBuilders.js';
import { encodeSelectedVacationV5Document } from './vacationV5DocumentCodec.js';

type ProfileRow = { id: string; instance_id: string; key_fingerprint: string; recipient_token: string;
  active: number; capabilities_json: string | null };

export interface VacationV5FileExportInput {
  selection: VacationV5ScopeSelection;
  measureIds?: readonly string[];
  documentIds?: readonly string[];
  officeDocumentIds?: readonly string[];
  profileId: string;
  expiresAt: string;
  passphrase: string;
  capabilities: TransferCapabilities;
  targetPath: string;
}

function checkedProfile(database: DatabaseAdapter, id: string, requireReadFive: boolean): ProfileRow {
  const profile = database.prepare<ProfileRow>('SELECT * FROM transfer_recipient_profiles WHERE id = ?').get(id);
  if (!profile || !profile.active) throw new Error('Die bekannte Gegeninstanz ist nicht aktiv.');
  const token = parseTransferRecipientToken(profile.recipient_token);
  if (token.instanceId !== profile.instance_id || token.keyFingerprint !== profile.key_fingerprint) {
    throw new Error('Das Empfängerprofil enthält eine widersprüchliche Schlüsselbindung.');
  }
  if (requireReadFive) {
    const capabilities = profile.capabilities_json
      ? assertTransferCapabilities(JSON.parse(profile.capabilities_json) as unknown) : null;
    if (!capabilities?.readFormats.includes(5) || !capabilities.features.includes('vacation_scope_v5')) {
      throw new Error('Die Zielinstanz hat Format 5 nicht verifiziert bestätigt.');
    }
  }
  return profile;
}

function assertOutputPath(filePath: string): void {
  if (!path.isAbsolute(filePath) || path.extname(filePath).toLowerCase() !== CASE_HANDOVER_FILE_EXTENSION) {
    throw new Error('Das Exportziel muss ein absoluter Pfad zu einer .gsbvtransfer-Datei sein.');
  }
}

function assertSourceUnchanged(database: DatabaseAdapter, sourceByRef: VacationV5PackageSourceByRef, dataDirectory: string): void {
  for (const source of Object.values(sourceByRef)) {
    const table = vacationV5SourceTable(source.kind);
    const row = database.prepare<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`).get(source.localId);
    const contentBase64 = row && (source.kind === 'case_document' || source.kind === 'generated_document')
      ? encodeSelectedVacationV5Document(row, dataDirectory).contentBase64 : undefined;
    if (!row || caseHandoverBaselineHash(row, contentBase64) !== source.baselineSha256) {
      throw new Error('Ein ausgewählter Vorgang hat sich während des Exports geändert. Bitte die Vorschau erneut prüfen.');
    }
  }
}

/** Internal format-5 path for modelled case and case-free sections. */
export class VacationV5FileService {
  constructor(private readonly database: DatabaseAdapter,
    private readonly dataDirectoryProvider: () => string = () => path.join(process.cwd(), 'data')) {}

  async exportToFile(input: VacationV5FileExportInput): Promise<{
    packageId: string; sectionCounts: Array<{ type: string; count: number }>; targetInstanceId: string;
  }> {
    assertOutputPath(input.targetPath);
    if (!input.selection.caseIds.length && (input.documentIds?.length || input.measureIds?.length)) {
      throw new Error('Dokumente und Maßnahmen erfordern eine ausgewählte Fallakte.');
    }
    const targetProfile = checkedProfile(this.database, input.profileId, true);
    const target = parseTransferRecipientToken(targetProfile.recipient_token);
    const capabilities = assertTransferCapabilities(input.capabilities);
    if (!capabilities.writeFormats.includes(5) || !capabilities.features.includes('vacation_scope_v5')) {
      throw new Error('Die abgebende Instanz bietet Format 5 nicht an.');
    }
    const other = collectVacationV5Sections(this.database, input.selection);
    const cases = input.selection.caseIds.length
      ? collectVacationV5CaseSections(this.database, { caseIds: input.selection.caseIds,
        measureIds: input.measureIds, documentIds: input.documentIds, dataDirectory: this.dataDirectoryProvider() })
      : { sections: [], sourceByRef: {} };
    const office = collectVacationV5OfficeDocuments(this.database, input.officeDocumentIds ?? [],
      other.sourceByRef, this.dataDirectoryProvider());
    const sections = [...cases.sections, ...other.sections, ...office.sections];
    const sourceByRef: VacationV5PackageSourceByRef = { ...cases.sourceByRef, ...other.sourceByRef, ...office.sourceByRef };
    const sender = new TransferInstanceIdentityService(this.database).getPrivateIdentity();
    const envelope = sealVacationV5Transport({ packageId: `handover_${randomUUID()}`, expiresAt: input.expiresAt,
      sections, capabilities, passphrase: input.passphrase, sender, target });
    const confirmedProfile = checkedProfile(this.database, input.profileId, true);
    if (confirmedProfile.key_fingerprint !== target.keyFingerprint || confirmedProfile.recipient_token !== targetProfile.recipient_token) {
      throw new Error('Die Zielbindung hat sich während des Exports geändert.');
    }
    let written = false;
    try {
      await new DatabaseUnitOfWork(this.database).runAsync(async () => {
        await writeCaseHandoverFile(input.targetPath, JSON.stringify(envelope), { replaceExisting: false });
        written = true;
        assertSourceUnchanged(this.database, sourceByRef, this.dataDirectoryProvider());
        recordVacationV5Export(this.database, { packageId: envelope.packageId, createdAt: envelope.createdAt,
          expiresAt: envelope.expiresAt ?? input.expiresAt, targetInstanceId: target.instanceId,
          targetKeyFingerprint: target.keyFingerprint, sourceByRef });
        new PersonalDataAuditLogService(this.database).append(auditCaseHandoverExported({
          packageId: envelope.packageId, caseCount: cases.sections.find((section) => section.type === 'case')?.count ?? 0,
          deadlineCount: sections.filter((section) => section.type === 'deadline' || section.type === 'case_deadline')
            .reduce((total, section) => total + section.count, 0),
          validUntilPresent: true, result: 'success',
        }));
      });
    } catch (error) {
      if (written) await fs.promises.rm(input.targetPath, { force: true }).catch(() => undefined);
      throw error;
    }
    return { packageId: envelope.packageId, targetInstanceId: target.instanceId,
      sectionCounts: sections.map((section) => ({ type: section.type, count: section.count })) };
  }

  importFromFile(filePath: string, passphrase: string, expectedPackageId?: string): { importId: string; importedCount: number; packageId: string } {
    const { payload, sender, recipient } = this.openPayloadFromFile(filePath, passphrase);
    if (expectedPackageId !== undefined && payload.packageId !== expectedPackageId) {
      throw new Error('Das ausgewählte Paket stimmt nicht mehr mit der bestätigten Vorschau überein.');
    }
    const imported = importVacationV5Package(this.database, payload,
      { originKeyFingerprint: sender.keyFingerprint, targetKeyFingerprint: recipient.keyFingerprint }, this.dataDirectoryProvider);
    return { ...imported, packageId: payload.packageId };
  }

  reviewFromFile(filePath: string, passphrase: string): {
    packageId: string; expiresAt: string; senderInstanceId: string;
    sectionCounts: Array<{ type: string; count: number }>; documentCount: number; documentBytes: number;
    documents: Array<{ filename: string; owner: string; sizeBytes: number }>;
  } {
    const { payload } = this.openPayloadFromFile(filePath, passphrase);
    const names = new Map(payload.sections.flatMap((section) => section.items.map((item) => [item.ref,
      String(item.data.case_number ?? item.data.title ?? item.data.subject ?? item.data.vacancy_title ?? section.type)] as const)));
    const officeOwners = new Map(payload.sections.flatMap((section) =>
      section.type === 'workflow_document_link' || section.type === 'violation_document_link'
        ? section.items.flatMap((item) => 'documentRef' in item && 'ownerRef' in item
          ? [[String(item.documentRef), String(item.ownerRef)] as const] : []) : []));
    const documents = payload.sections.flatMap((section) => section.items.filter((item) =>
      section.type === 'case_document' || section.type === 'generated_document').map((item) => {
      const ownerRef = 'links' in item ? item.links.caseRef : officeOwners.get(item.ref);
      return { filename: String(item.data.filename ?? 'Dokument'), owner: names.get(ownerRef ?? '') ?? 'Vorgang',
        sizeBytes: Buffer.from('contentBase64' in item && typeof item.contentBase64 === 'string'
          ? item.contentBase64 : '', 'base64').length };
    }));
    return { packageId: payload.packageId, expiresAt: payload.expiresAt,
      senderInstanceId: payload.origin.instanceId,
      sectionCounts: payload.sections.map((section) => ({ type: section.type, count: section.count })),
      documentCount: documents.length,
      documentBytes: documents.reduce((sum, item) => sum + item.sizeBytes, 0), documents };
  }

  private openPayloadFromFile(filePath: string, passphrase: string): {
    payload: VacationV5Payload;
    sender: ReturnType<typeof parseTransferRecipientToken>;
    recipient: ReturnType<TransferInstanceIdentityService['getPrivateIdentity']>;
  } {
    const file = inspectCaseHandoverFilePath(filePath);
    let parsed: unknown;
    try { parsed = JSON.parse(fs.readFileSync(file.filePath, 'utf8')) as unknown; }
    catch { throw new Error('Die Übergabedatei enthält kein gültiges Format-5-Paket.'); }
    const originFingerprint = (parsed as { senderProof?: { originKeyFingerprint?: unknown } })?.senderProof?.originKeyFingerprint;
    if (typeof originFingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(originFingerprint)) {
      throw new Error('Die Herkunft des Format-5-Pakets ist nicht prüfbar.');
    }
    const profile = this.database.prepare<ProfileRow>('SELECT * FROM transfer_recipient_profiles WHERE key_fingerprint = ?').get(originFingerprint);
    if (!profile) throw new Error('Die abgebende Instanz ist nicht als Gegeninstanz bekannt.');
    checkedProfile(this.database, profile.id, false);
    const sender = parseTransferRecipientToken(profile.recipient_token);
    const recipient = new TransferInstanceIdentityService(this.database).getPrivateIdentity();
    const payload: VacationV5Payload = openVacationV5Transport(parsed, passphrase, recipient, sender);
    if (!payload.capabilities.writeFormats.includes(5) || !payload.capabilities.features.includes('vacation_scope_v5')) {
      throw new Error('Die abgebende Instanz bietet Format 5 nicht an.');
    }
    return { payload, sender, recipient };
  }
}
