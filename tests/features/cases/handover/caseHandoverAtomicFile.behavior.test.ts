import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeCaseHandoverFile } from '../../../../services/caseHandoverAtomicFile';

describe('Atomare Übergabedatei', () => {
  it('legt eine neue Datei ohne Überschreiben an und entfernt temporäre Dateien', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-handover-atomic-'));
    const target = path.join(directory, 'handover.gsbvtransfer');
    try {
      await writeCaseHandoverFile(target, 'encrypted-first', { replaceExisting: false });
      await expect(writeCaseHandoverFile(target, 'encrypted-second', { replaceExisting: false })).rejects.toThrow();
      expect(fs.readFileSync(target, 'utf8')).toBe('encrypted-first');
      expect(fs.readdirSync(directory)).toEqual(['handover.gsbvtransfer']);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
