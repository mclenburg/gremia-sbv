import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CaseHandoverService } from '../../../../services/caseHandoverService';
import { encryptAuthenticatedTransferPayload } from '../../../../services/caseHandoverCrypto';
import { CASE_HANDOVER_FORMAT, CASE_HANDOVER_TARGET_BOUND_LEGACY_VERSION } from '../../../../services/caseHandoverPolicy';
import { openTestDatabase } from '../../../helpers/openTestDatabase';

const temporaryRoots: string[] = [];

afterEach(() => {
  while (temporaryRoots.length) fs.rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
});

function legacyV2File(): { filePath: string; passphrase: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-handover-v2-'));
  temporaryRoots.push(root);
  const passphrase = 'Altes aber bekanntes Übergabepaket';
  const packageId = 'handover_legacy_v2';
  const createdAt = '2026-08-01T08:00:00.000Z';
  const payload = {
    format: CASE_HANDOVER_FORMAT,
    version: CASE_HANDOVER_TARGET_BOUND_LEGACY_VERSION,
    packageId,
    createdAt,
    purpose: 'Frühere Urlaubsvertretung',
    packageType: 'vacation_handover',
    cases: [{ ref: 'case_1', data: { id: 'source-case', case_number: 'ALT-1', display_name: 'Altbestand', category: 'sonstiges', status: 'offen' } }],
    protectedPersons: [], notes: [], measures: [], measureNotes: [], deadlines: [], documents: [],
  };
  const envelope = encryptAuthenticatedTransferPayload({
    format: CASE_HANDOVER_FORMAT,
    version: CASE_HANDOVER_TARGET_BOUND_LEGACY_VERSION,
    packageId,
    createdAt,
    payloadText: JSON.stringify(payload),
    passphrase,
  });
  const filePath = path.join(root, 'altbestand.gsbvtransfer');
  fs.writeFileSync(filePath, JSON.stringify(envelope));
  return { filePath, passphrase };
}

describe('Fallübergabe – abgesicherte Altformat-Kompatibilität', () => {
  it('prüft Version 2, schreibt aber erst nach ausdrücklicher Altformat-Freigabe', async () => {
    const database = await openTestDatabase();
    database.exec(fs.readFileSync('database/schema.sql', 'utf8'));
    const transfer = legacyV2File();
    const service = new CaseHandoverService(database, () => path.join(path.dirname(transfer.filePath), 'data'));

    const inspection = service.inspect(transfer.filePath, transfer.passphrase);
    expect(inspection).toMatchObject({
      valid: true,
      legacyImportConfirmationRequired: true,
      integrity: { verified: true, formatVersion: 2, legacyFormat: true },
    });

    await expect(service.importFromFile({
      filePath: transfer.filePath,
      passphrase: transfer.passphrase,
      mode: 'create_new',
    })).rejects.toThrow(/Altformat.*bestätigen/i);
    expect(database.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM cases').get()?.count).toBe(0);

    const imported = await service.importFromFile({
      filePath: transfer.filePath,
      passphrase: transfer.passphrase,
      mode: 'create_new',
      allowLegacyPackage: true,
    });
    expect(imported.createdCaseIds).toHaveLength(1);
    database.close();
  });
});
