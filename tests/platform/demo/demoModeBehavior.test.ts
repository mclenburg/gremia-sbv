import { mkdirSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { isDemoMode, prepareDemoVault, resetDemoDataDirectory, resolveDemoDataDirectory } from '../../../services/demoMode';

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

it('verweigert Reset außerhalb des Temp-Verzeichnisses und folgt keinen symbolischen Links', () => {
  expect(() => resetDemoDataDirectory(path.parse(os.tmpdir()).root)).toThrow(/temporären Systemverzeichnisses/);
  const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-demo-link-'));
  const target = mkdtempSync(path.join(os.tmpdir(), 'gremia-demo-target-'));
  const link = path.join(root, 'linked');
  symlinkSync(target, link, 'dir');
  expect(() => resetDemoDataDirectory(link)).toThrow(/symbolischer Link/);
  expect(existsSync(target)).toBe(true);
  rmSync(root, { recursive: true, force: true });
  rmSync(target, { recursive: true, force: true });
});

it('lets demo isolation win over a configured productive data directory without touching production data', () => {
  const productiveRoot = mkdtempSync(path.join(os.tmpdir(), 'gremia-production-sentinel-'));
  const sentinel = path.join(productiveRoot, 'productive.sqlite');
  writeFileSync(sentinel, 'must-survive');
  const previousDataDir = process.env.GREMIA_SBV_DATA_DIR;
  process.env.GREMIA_SBV_DATA_DIR = productiveRoot;
  process.env.GREMIA_SBV_DEMO = '1';
  try {
    expect(resolveDemoDataDirectory()).not.toBe(productiveRoot);
    resetDemoDataDirectory(resolveDemoDataDirectory());
    expect(existsSync(sentinel)).toBe(true);
  } finally {
    if (previousDataDir === undefined) delete process.env.GREMIA_SBV_DATA_DIR;
    else process.env.GREMIA_SBV_DATA_DIR = previousDataDir;
    rmSync(productiveRoot, { recursive: true, force: true });
  }
});


it('removes a partially initialized demo vault when seeding fails', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-demo-partial-'));
  const lockReasons: string[] = [];
  const security = {
    getDataDirectory: () => root,
    setupInitialPassword: async () => {
      writeFileSync(path.join(root, 'security.json'), 'partial');
      return { ok: true };
    },
    getActiveDatabase: () => { throw new Error('injected seed failure'); },
    lock: (reason: string) => { lockReasons.push(reason); },
  };

  await expect(prepareDemoVault(security as never)).rejects.toThrow('injected seed failure');
  expect(lockReasons).toEqual(['demo-initialization-failed']);
  expect(existsSync(root)).toBe(false);
});

it('cleans a partial demo directory when initial password setup reports an unwritable-path failure', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-demo-unwritable-'));
  const lockReasons: string[] = [];
  writeFileSync(path.join(root, 'partial.tmp'), 'partial');
  const security = {
    getDataDirectory: () => root,
    setupInitialPassword: async () => ({ ok: false, error: 'Demo-Verzeichnis ist nicht beschreibbar.' }),
    lock: (reason: string) => { lockReasons.push(reason); },
  };
  await expect(prepareDemoVault(security as never)).rejects.toThrow(/nicht beschreibbar/);
  expect(lockReasons).toEqual(['demo-initialization-failed']);
  expect(existsSync(root)).toBe(false);
});
