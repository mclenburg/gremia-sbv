import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { inspectCaseHandoverFilePath } from './caseHandoverFilePolicy.js';
import { parseTransferRecipientToken } from './transferInstanceIdentityPolicy.js';
import { TransferInstanceIdentityService } from './transferInstanceIdentityService.js';
import { openVacationV5ReturnTransport } from './vacationV5ReturnTransport.js';
import { previewVacationV5ReturnPayload } from './vacationV5ReturnPreview.js';
import type { VacationV5PlannedReturnItem } from '../src/domain/transfer/vacationV5ReturnPlan.js';

type ProfileRow = { recipient_token: string; key_fingerprint: string; active: number };

/** Opens and previews a return without changing the original export or its source records. */
export class VacationV5ReturnFileService {
  constructor(private readonly database: DatabaseAdapter,
    private readonly dataDirectoryProvider: () => string = () => path.join(process.cwd(), 'data')) {}

  previewFromFile(filePath: string, passphrase: string): {
    packageId: string; sourcePackageId: string; exportId: string; items: VacationV5PlannedReturnItem[];
  } {
    const file = inspectCaseHandoverFilePath(filePath);
    let parsed: unknown;
    try { parsed = JSON.parse(fs.readFileSync(file.filePath, 'utf8')) as unknown; }
    catch { throw new Error('Die Rückgabedatei enthält kein gültiges Format-5-Paket.'); }
    const fingerprint = (parsed as { senderProof?: { originKeyFingerprint?: unknown } })?.senderProof?.originKeyFingerprint;
    if (typeof fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(fingerprint)) {
      throw new Error('Die Herkunft der Format-5-Rückgabe ist nicht prüfbar.');
    }
    const profile = this.database.prepare<ProfileRow>(
      'SELECT recipient_token, key_fingerprint, active FROM transfer_recipient_profiles WHERE key_fingerprint = ?')
      .get(fingerprint);
    if (!profile || !profile.active || profile.key_fingerprint !== fingerprint) {
      throw new Error('Die rückgebende Instanz ist nicht als aktive Gegeninstanz bekannt.');
    }
    const sender = parseTransferRecipientToken(profile.recipient_token);
    if (sender.keyFingerprint !== fingerprint) throw new Error('Das Gegenprofil enthält eine widersprüchliche Schlüsselbindung.');
    const recipient = new TransferInstanceIdentityService(this.database).getPrivateIdentity();
    const payload = openVacationV5ReturnTransport(parsed, passphrase, recipient, sender);
    const preview = previewVacationV5ReturnPayload(this.database, payload, this.dataDirectoryProvider());
    return { packageId: payload.packageId, sourcePackageId: payload.sourcePackageId,
      exportId: preview.exportId, items: preview.items };
  }
}
