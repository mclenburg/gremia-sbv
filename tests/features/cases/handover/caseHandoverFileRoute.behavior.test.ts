import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { classifyCaseHandoverFile } from '../../../../services/caseHandoverFileRoute';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-route-'));
afterEach(() => { for (const file of fs.readdirSync(directory)) fs.rmSync(path.join(directory, file)); });
afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));

function fixture(name: string, value: unknown): string {
  const file = path.join(directory, `${name}.gsbvtransfer`);
  fs.writeFileSync(file, JSON.stringify(value));
  return file;
}

describe('Übergabedatei automatisch zuordnen', () => {
  it('unterscheidet ältere Pakete, Format-5-Vertretungen und Format-5-Rückgaben anhand der Hülle', () => {
    expect(classifyCaseHandoverFile(fixture('legacy', { format: 'gremia-sbv-case-handover', version: 2 })))
      .toEqual({ formatVersion: 2, kind: 'legacy' });
    expect(classifyCaseHandoverFile(fixture('vacation', { format: 'gremia-sbv-case-handover', version: 5,
      senderProof: { packageType: 'vacation_handover' } })))
      .toEqual({ formatVersion: 5, kind: 'vacation_v5' });
    expect(classifyCaseHandoverFile(fixture('return', { format: 'gremia-sbv-case-handover', version: 5,
      senderProof: { packageType: 'return_delta' } })))
      .toEqual({ formatVersion: 5, kind: 'return_v5' });
  });

  it('weist unbekannte und widersprüchliche Hüllen vor der Formularauswahl ab', () => {
    expect(() => classifyCaseHandoverFile(fixture('unknown', { format: 'gremia-sbv-case-handover', version: 99 })))
      .toThrow(/neuere Format 99.*aktualisieren/);
    expect(() => classifyCaseHandoverFile(fixture('missing-type', { format: 'gremia-sbv-case-handover', version: 5 })))
      .toThrow(/Pakettyp/);
  });
});
