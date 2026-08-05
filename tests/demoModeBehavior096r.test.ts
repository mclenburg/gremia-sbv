import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { isDemoMode, resetDemoDataDirectory, resolveDemoDataDirectory } from '../services/demoMode';

const previous = process.env.GREMIA_SBV_DEMO;
afterEach(() => {
  if (previous === undefined) delete process.env.GREMIA_SBV_DEMO;
  else process.env.GREMIA_SBV_DEMO = previous;
});

describe('Demo-Modus – Aktivierung und Datenisolation', () => {
  it('aktiviert den Modus ausschließlich über Umgebungsvariable oder explizites Argument', () => {
    delete process.env.GREMIA_SBV_DEMO;
    expect(isDemoMode(['electron', 'app'])).toBe(false);
    expect(isDemoMode(['electron', 'app', '--demo'])).toBe(true);
    process.env.GREMIA_SBV_DEMO = '1';
    expect(isDemoMode(['electron', 'app'])).toBe(true);
    process.env.GREMIA_SBV_DEMO = '0';
    expect(isDemoMode(['electron', 'app'])).toBe(false);
  });

  it('verwendet ein separates temporäres Verzeichnis und setzt es idempotent zurück', () => {
    expect(resolveDemoDataDirectory()).toBe(path.join(os.tmpdir(), 'gremia-sbv-demo'));
    const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-demo-reset-'));
    const nested = path.join(root, 'db');
    mkdirSync(nested);
    writeFileSync(path.join(nested, 'vault.db'), 'demo');

    resetDemoDataDirectory(root);
    expect(existsSync(root)).toBe(false);
    expect(() => resetDemoDataDirectory(root)).not.toThrow();
    rmSync(root, { recursive: true, force: true });
  });
});
