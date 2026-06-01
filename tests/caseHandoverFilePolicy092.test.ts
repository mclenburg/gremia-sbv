import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { inspectCaseHandoverFilePath, isLikelyNetworkPath } from '../services/caseHandoverFilePolicy';

function writeTransferFixture(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-sbv-transfer-policy-'));
  const filePath = path.join(directory, 'falluebergabe.gsbvtransfer');
  fs.writeFileSync(filePath, '{}');
  return filePath;
}

describe('case handover file policy 0.9.2', () => {
  it('akzeptiert beliebige lokale absolute gsbvtransfer-Dateien, aber keine freien relativen Pfade', () => {
    const filePath = writeTransferFixture();
    const inspection = inspectCaseHandoverFilePath(filePath);

    expect(inspection.filePath).toBe(filePath);
    expect(inspection.fileName).toBe('falluebergabe.gsbvtransfer');
    expect(inspection.sizeBytes).toBeGreaterThan(0);
    expect(() => inspectCaseHandoverFilePath('falluebergabe.gsbvtransfer')).toThrow(/absoluten Dateipfad/);
  });

  it('weist falsche Endungen und Verzeichnisse ab und erkennt Netzwerkpfade als Warnkontext', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-sbv-transfer-policy-'));
    const wrongExtension = path.join(directory, 'falluebergabe.json');
    fs.writeFileSync(wrongExtension, '{}');

    expect(() => inspectCaseHandoverFilePath(wrongExtension)).toThrow(/gsbvtransfer/);
    expect(() => inspectCaseHandoverFilePath(directory)).toThrow(/gsbvtransfer|reguläre Datei/);
    expect(isLikelyNetworkPath(String.raw`\\server\share\falluebergabe.gsbvtransfer`)).toBe(true);
  });
});
