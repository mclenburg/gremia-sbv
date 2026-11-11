import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import type { TransferCapabilities } from '../src/domain/models/transfer-capability.model.js';
import type { VacationV5PackageSourceKind } from './vacationV5PackageSource.js';
import { CASE_HANDOVER_FILE_EXTENSION, inspectCaseHandoverFilePath } from './caseHandoverFilePolicy.js';
import { parseTransferRecipientToken } from './transferInstanceIdentityPolicy.js';
import { TransferInstanceIdentityService } from './transferInstanceIdentityService.js';
import { openVacationV5ReturnTransport, sealVacationV5ReturnTransport,
  type VacationV5ReturnPayload } from './vacationV5ReturnTransport.js';
import { previewVacationV5ReturnPayload } from './vacationV5ReturnPreview.js';
import type { VacationV5PlannedReturnItem } from '../src/domain/transfer/vacationV5ReturnPlan.js';
import { collectVacationV5ReturnChanges, type VacationV5ReturnSourceByRef } from './vacationV5ReturnCollector.js';
import { assertTransferCapabilities } from './transferCapabilityDocument.js';
import { vacationV5SourceTable } from './vacationV5PackageSource.js';
import { caseHandoverBaselineHash } from './caseHandoverBaselineHash.js';
import { encodeSelectedVacationV5Document } from './vacationV5DocumentCodec.js';
import { writeCaseHandoverFile } from './caseHandoverAtomicFile.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { recordVacationV5ReturnExport } from './caseHandoverExportLedger.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditCaseHandoverExported } from './auditEventBuilders.js';
import { importConfirmedVacationV5Return, type VacationV5ReturnChoice } from './vacationV5ReturnImporter.js';

type ProfileRow = { recipient_token: string; key_fingerprint: string; active: number; capabilities_json: string | null };

export interface VacationV5ReturnFileExportInput {
  sourcePackageId: string;
  profileId: string;
  expiresAt: string;
  passphrase: string;
  capabilities: TransferCapabilities;
  targetPath: string;
  cancellationRequests?: readonly { ref: string; reason: string }[];
  additionalItems?: readonly { kind: VacationV5PackageSourceKind; localId: string }[];
}

function assertReturnSourceUnchanged(database: DatabaseAdapter, sources: VacationV5ReturnSourceByRef,
  dataDirectory: string): void {
  for (const source of Object.values(sources)) {
    const row = database.prepare<Record<string, unknown>>(
      `SELECT * FROM ${vacationV5SourceTable(source.kind)} WHERE id = ?`).get(source.localId);
    const contentBase64 = row && (source.kind === 'case_document' || source.kind === 'generated_document')
      ? encodeSelectedVacationV5Document(row, dataDirectory).contentBase64 : undefined;
    if ((row ? caseHandoverBaselineHash(row, contentBase64) : null) !== source.currentSha256) {
      throw new Error('Ein Rückgabevorgang hat sich während des Exports geändert. Bitte die Vorschau erneuern.');
    }
  }
}

/** Opens and previews a return without changing the original export or its source records. */
export class VacationV5ReturnFileService {
  constructor(private readonly database: DatabaseAdapter,
    private readonly dataDirectoryProvider: () => string = () => path.join(process.cwd(), 'data')) {}

  async exportToFile(input: VacationV5ReturnFileExportInput): Promise<{
    packageId: string; changeCount: number; targetInstanceId: string;
  }> {
    if (!path.isAbsolute(input.targetPath) || path.extname(input.targetPath).toLowerCase() !== CASE_HANDOVER_FILE_EXTENSION) {
      throw new Error('Rückgabeziel muss ein absoluter .gsbvtransfer-Pfad sein.');
    }
    const imported = this.database.prepare<{ id: string; status: string; format_version: number;
      origin_key_fingerprint: string | null }>(`
      SELECT id, status, format_version, origin_key_fingerprint FROM case_handover_imports WHERE package_id = ?
    `).get(input.sourcePackageId);
    if (!imported || imported.format_version !== 5 || imported.status !== 'active'
      || !imported.origin_key_fingerprint) throw new Error('Ausgangspaket ist nicht für eine Format-5-Rückgabe aktiv.');
    const profile = this.database.prepare<ProfileRow>('SELECT * FROM transfer_recipient_profiles WHERE id = ?').get(input.profileId);
    if (!profile || !profile.active || profile.key_fingerprint !== imported.origin_key_fingerprint) {
      throw new Error('Rückgabeziel stimmt nicht mit der ursprünglichen Instanz überein.');
    }
    const target = parseTransferRecipientToken(profile.recipient_token);
    if (target.keyFingerprint !== profile.key_fingerprint) throw new Error('Rückgabeprofil enthält eine widersprüchliche Schlüsselbindung.');
    const targetCapabilities = profile.capabilities_json
      ? assertTransferCapabilities(JSON.parse(profile.capabilities_json) as unknown) : null;
    if (!targetCapabilities?.readFormats.includes(5) || !targetCapabilities.features.includes('return_scope_v5')) {
      throw new Error('Ursprungsinstanz hat die Format-5-Rückgabe nicht verifiziert bestätigt.');
    }
    const localCapabilities = assertTransferCapabilities(input.capabilities);
    const collected = collectVacationV5ReturnChanges(this.database, input.sourcePackageId,
      this.dataDirectoryProvider(), input.cancellationRequests, input.additionalItems);
    if (!collected.changes.length) throw new Error('Rückgabe enthält keine ausgewählten Änderungen.');
    const sender = new TransferInstanceIdentityService(this.database).getPrivateIdentity();
    const envelope = sealVacationV5ReturnTransport({ packageId: `handover_${randomUUID()}`,
      sourcePackageId: input.sourcePackageId, expiresAt: input.expiresAt, changes: collected.changes,
      capabilities: localCapabilities, passphrase: input.passphrase, sender, target });
    const confirmed = this.database.prepare<ProfileRow>('SELECT * FROM transfer_recipient_profiles WHERE id = ?').get(input.profileId);
    if (!confirmed?.active || confirmed.recipient_token !== profile.recipient_token
      || confirmed.capabilities_json !== profile.capabilities_json) throw new Error('Rückgabeziel hat sich während des Exports geändert.');
    let written = false;
    try {
      await new DatabaseUnitOfWork(this.database).runAsync(async () => {
        await writeCaseHandoverFile(input.targetPath, JSON.stringify(envelope), { replaceExisting: false });
        written = true;
        const current = this.database.prepare<{ status: string }>(
          'SELECT status FROM case_handover_imports WHERE id = ?').get(imported.id);
        if (current?.status !== 'active') throw new Error('Ausgangspaket wurde zwischenzeitlich zurückgegeben.');
        assertReturnSourceUnchanged(this.database, collected.sourceByRef, this.dataDirectoryProvider());
        recordVacationV5ReturnExport(this.database, { packageId: envelope.packageId,
          sourcePackageId: input.sourcePackageId, createdAt: envelope.createdAt,
          expiresAt: envelope.expiresAt ?? input.expiresAt, targetInstanceId: target.instanceId,
          targetKeyFingerprint: target.keyFingerprint, sourceByRef: collected.sourceByRef });
        this.database.prepare("UPDATE case_handover_imports SET status = 'returned' WHERE id = ?").run(imported.id);
        new PersonalDataAuditLogService(this.database).append(auditCaseHandoverExported({
          packageId: envelope.packageId,
          caseCount: collected.changes.filter((item) => item.kind === 'case').length,
          documentCount: collected.changes.filter((item) => item.kind === 'case_document' || item.kind === 'generated_document').length,
          deadlineCount: collected.changes.filter((item) => item.kind === 'deadline' || item.kind === 'case_deadline').length,
          result: 'success',
        }));
      });
    } catch (error) {
      if (written) await fs.promises.rm(input.targetPath, { force: true }).catch(() => undefined);
      throw error;
    }
    return { packageId: envelope.packageId, changeCount: collected.changes.length,
      targetInstanceId: target.instanceId };
  }

  previewFromFile(filePath: string, passphrase: string): {
    packageId: string; sourcePackageId: string; exportId: string; items: VacationV5PlannedReturnItem[];
  } {
    const payload = this.openVerifiedPayload(filePath, passphrase);
    const preview = previewVacationV5ReturnPayload(this.database, payload, this.dataDirectoryProvider());
    return { packageId: payload.packageId, sourcePackageId: payload.sourcePackageId,
      exportId: preview.exportId, items: preview.items };
  }

  importConfirmedFromFile(filePath: string, passphrase: string,
    choices: readonly VacationV5ReturnChoice[]): { importId: string; acceptedCount: number; reviewedCount: number } {
    const payload = this.openVerifiedPayload(filePath, passphrase);
    return importConfirmedVacationV5Return(this.database, payload, choices, this.dataDirectoryProvider());
  }

  private openVerifiedPayload(filePath: string, passphrase: string): VacationV5ReturnPayload {
    const file = inspectCaseHandoverFilePath(filePath);
    let parsed: unknown;
    try { parsed = JSON.parse(fs.readFileSync(file.filePath, 'utf8')) as unknown; }
    catch { throw new Error('Die Rückgabedatei enthält kein gültiges Format-5-Paket.'); }
    const fingerprint = (parsed as { senderProof?: { originKeyFingerprint?: unknown } })?.senderProof?.originKeyFingerprint;
    if (typeof fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(fingerprint)) {
      throw new Error('Die Herkunft der Format-5-Rückgabe ist nicht prüfbar.');
    }
    const profile = this.database.prepare<ProfileRow>(
      'SELECT recipient_token, key_fingerprint, active, capabilities_json FROM transfer_recipient_profiles WHERE key_fingerprint = ?')
      .get(fingerprint);
    if (!profile || !profile.active || profile.key_fingerprint !== fingerprint) {
      throw new Error('Die rückgebende Instanz ist nicht als aktive Gegeninstanz bekannt.');
    }
    const sender = parseTransferRecipientToken(profile.recipient_token);
    if (sender.keyFingerprint !== fingerprint) throw new Error('Das Gegenprofil enthält eine widersprüchliche Schlüsselbindung.');
    const recipient = new TransferInstanceIdentityService(this.database).getPrivateIdentity();
    return openVacationV5ReturnTransport(parsed, passphrase, recipient, sender);
  }
}
