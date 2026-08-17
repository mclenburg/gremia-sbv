import { mkdtempSync, statSync, utimesSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { rmSync } from 'node:fs';
import { TempFileService } from '../../../services/tempFileService';

const roots: string[] = [];
function createService(): TempFileService {
  const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-temp-test-'));
  roots.push(root);
  return new TempFileService(root);
}
afterEach(() => { while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true }); });

describe('Temporäre Dateien – Lebenszyklus und Sicherheitsverhalten', () => {
  it('legt alle Scopes an, säubert Dateinamen und schreibt Arbeitskopien mit restriktiven Rechten', () => {
    const service = createService();
    service.ensureLayout();
    const target = service.write('document-preview', '../../geheim?.pdf', Buffer.from('inhalt'), 'doc');

    expect(path.dirname(target)).toBe(service.scopeDir('document-preview'));
    expect(path.basename(target)).not.toMatch(/[/?\\]/);
    expect(statSync(target).mode & 0o777).toBe(0o600);
    expect(service.status()).toMatchObject({ remaining: 1, bytesRemaining: 6, failed: 0 });
  });

  it('löscht bei sofortigem Cleanup alle Dateien und meldet einen leeren Status', () => {
    const service = createService();
    const first = service.write('report-preview', 'eins.txt', Buffer.from('1'));
    const second = service.write('misc', 'zwei.txt', Buffer.from('22'));

    const result = service.cleanup();

    expect(result).toMatchObject({ deleted: 2, failed: 0, remaining: 0, bytesRemaining: 0 });
    expect(existsSync(first)).toBe(false);
    expect(existsSync(second)).toBe(false);
  });

  it('löscht nur hinreichend alte Dateien und erhält junge Arbeitskopien', () => {
    const service = createService();
    const oldFile = service.write('document-preview', 'alt.txt', Buffer.from('alt'));
    const newFile = service.write('document-preview', 'neu.txt', Buffer.from('neu'));
    const oldDate = new Date(Date.now() - 60_000);
    utimesSync(oldFile, oldDate, oldDate);

    const result = service.cleanupStale(30_000);

    expect(result.deleted).toBe(1);
    expect(result.remaining).toBe(1);
    expect(existsSync(oldFile)).toBe(false);
    expect(existsSync(newFile)).toBe(true);
    expect(service.status().oldestRemainingAt).toBeDefined();
  });
});
