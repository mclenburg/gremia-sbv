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
import type { VacationV5SourceByRef } from './vacationV5SectionCollector.js';
import { VACATION_V5_ROW_FIELDS } from './vacationV5RowPolicy.js';
import { caseHandoverBaselineHash } from './caseHandoverBaselineHash.js';
import { sealVacationV5Transport, openVacationV5Transport, type VacationV5Payload } from './vacationV5Transport.js';
import { importVacationV5Sections } from './vacationV5SectionImporter.js';
import { recordVacationV5Export } from './caseHandoverExportLedger.js';
import { writeCaseHandoverFile } from './caseHandoverAtomicFile.js';
import { CASE_HANDOVER_FILE_EXTENSION, inspectCaseHandoverFilePath } from './caseHandoverFilePolicy.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditCaseHandoverExported } from './auditEventBuilders.js';

type ProfileRow = { id: string; instance_id: string; key_fingerprint: string; recipient_token: string;
  active: number; capabilities_json: string | null };

export interface VacationV5FileExportInput {
  selection: VacationV5ScopeSelection;
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

function assertSourceUnchanged(database: DatabaseAdapter, sourceByRef: VacationV5SourceByRef): void {
  for (const source of Object.values(sourceByRef)) {
    const table = VACATION_V5_ROW_FIELDS[source.kind].table;
    const row = database.prepare<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`).get(source.localId);
    if (!row || caseHandoverBaselineHash(row) !== source.baselineSha256) {
      throw new Error('Ein ausgewählter Vorgang hat sich während des Exports geändert. Bitte die Vorschau erneut prüfen.');
    }
  }
}

/** Internal format-5 path for the fully modelled case-free sections. */
export class VacationV5FileService {
  constructor(private readonly database: DatabaseAdapter) {}

  async exportToFile(input: VacationV5FileExportInput): Promise<{
    packageId: string; sectionCounts: Array<{ type: string; count: number }>; targetInstanceId: string;
  }> {
    assertOutputPath(input.targetPath);
    if (input.selection.caseIds.length) throw new Error('Fallakten sind im Format-5-Abschnittscollector noch nicht verfügbar.');
    const targetProfile = checkedProfile(this.database, input.profileId, true);
    const target = parseTransferRecipientToken(targetProfile.recipient_token);
    const capabilities = assertTransferCapabilities(input.capabilities);
    if (!capabilities.writeFormats.includes(5) || !capabilities.features.includes('vacation_scope_v5')) {
      throw new Error('Die abgebende Instanz bietet Format 5 nicht an.');
    }
    const collected = collectVacationV5Sections(this.database, input.selection);
    const sender = new TransferInstanceIdentityService(this.database).getPrivateIdentity();
    const envelope = sealVacationV5Transport({ packageId: `handover_${randomUUID()}`, expiresAt: input.expiresAt,
      sections: collected.sections, capabilities, passphrase: input.passphrase, sender, target });
    const confirmedProfile = checkedProfile(this.database, input.profileId, true);
    if (confirmedProfile.key_fingerprint !== target.keyFingerprint || confirmedProfile.recipient_token !== targetProfile.recipient_token) {
      throw new Error('Die Zielbindung hat sich während des Exports geändert.');
    }
    let written = false;
    try {
      await new DatabaseUnitOfWork(this.database).runAsync(async () => {
        await writeCaseHandoverFile(input.targetPath, JSON.stringify(envelope), { replaceExisting: false });
        written = true;
        assertSourceUnchanged(this.database, collected.sourceByRef);
        recordVacationV5Export(this.database, { packageId: envelope.packageId, createdAt: envelope.createdAt,
          expiresAt: envelope.expiresAt ?? input.expiresAt, targetInstanceId: target.instanceId,
          targetKeyFingerprint: target.keyFingerprint, sourceByRef: collected.sourceByRef });
        new PersonalDataAuditLogService(this.database).append(auditCaseHandoverExported({
          packageId: envelope.packageId, caseCount: 0, deadlineCount: collected.sections.find((section) => section.type === 'deadline')?.count ?? 0,
          validUntilPresent: true, result: 'success',
        }));
      });
    } catch (error) {
      if (written) await fs.promises.rm(input.targetPath, { force: true }).catch(() => undefined);
      throw error;
    }
    return { packageId: envelope.packageId, targetInstanceId: target.instanceId,
      sectionCounts: collected.sections.map((section) => ({ type: section.type, count: section.count })) };
  }

  importFromFile(filePath: string, passphrase: string): { importId: string; importedCount: number; packageId: string } {
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
    const imported = importVacationV5Sections(this.database, payload.packageId, payload.expiresAt,
      payload.sections, payload.manifest, { originKeyFingerprint: sender.keyFingerprint, targetKeyFingerprint: recipient.keyFingerprint });
    return { ...imported, packageId: payload.packageId };
  }
}
