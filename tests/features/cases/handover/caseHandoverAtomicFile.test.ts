import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeCaseHandoverFile } from '../../../../services/caseHandoverAtomicFile';

const roots: string[] = [];
afterEach(() => {
  while (roots.length) fs.rmSync(roots.pop()!, { recursive: true, force: true });
});

function root(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-transfer-write-'));
  roots.push(directory);
  return directory;
}

describe('geschütztes Schreiben eines Übergabepakets', () => {
  it('ersetzt ein bestehendes Paket vollständig und ohne zurückbleibende Arbeitsdatei', async () => {
    const directory = root();
    const target = path.join(directory, 'vertretung.gsbvtransfer');
    fs.writeFileSync(target, 'alter Stand');

    await writeCaseHandoverFile(target, '{"payload":"verschlüsselt"}');

    expect(fs.readFileSync(target, 'utf8')).toBe('{"payload":"verschlüsselt"}');
    expect(fs.readdirSync(directory)).toEqual(['vertretung.gsbvtransfer']);
    if (process.platform !== 'win32') expect(fs.statSync(target).mode & 0o777).toBe(0o600);
  });

  it('belässt bei fehlgeschlagener Umbenennung das Ziel und räumt die Arbeitsdatei auf', async () => {
    const directory = root();
    const target = path.join(directory, 'vertretung.gsbvtransfer');
    fs.mkdirSync(target);

    await expect(writeCaseHandoverFile(target, '{"payload":"verschlüsselt"}')).rejects.toThrow();

    expect(fs.statSync(target).isDirectory()).toBe(true);
    expect(fs.readdirSync(directory)).toEqual(['vertretung.gsbvtransfer']);
  });
});
