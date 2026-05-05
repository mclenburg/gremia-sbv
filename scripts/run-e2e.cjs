#!/usr/bin/env node
const { mkdtempSync, rmSync, existsSync, mkdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');

function isSafeE2eDir(value) {
  if (!value) return false;
  const normalized = resolve(value);
  const tempRoot = resolve(tmpdir());
  return normalized.startsWith(tempRoot) && normalized.includes('gremia-sbv-e2e-');
}

function localBin(name) {
  return process.platform === 'win32'
    ? join(process.cwd(), 'node_modules', '.bin', `${name}.cmd`)
    : join(process.cwd(), 'node_modules', '.bin', name);
}

function assertLocalPlaywrightInstalled() {
  const binary = localBin('playwright');
  if (existsSync(binary)) return binary;

  console.error('E2E-Abbruch: Playwright ist nicht lokal installiert.');
  console.error('Playwright ist bewusst nicht Teil der Standardinstallation, damit normale Builds nicht an optionalen UI-Test-Abhängigkeiten scheitern.');
  console.error('Für E2E-Tests bitte explizit ausführen:');
  console.error('  npm run test:e2e:setup');
  console.error('Danach:');
  console.error('  npm run test:e2e');
  console.error('Der E2E-Runner nutzt bewusst kein npx-Auto-Install und öffnet keine produktive Datenbank.');
  process.exit(3);
}

const args = process.argv.slice(2);
const keep = args.includes('--keep-data');
const headed = args.includes('--headed');
const debug = args.includes('--debug');
const passThrough = args.filter((arg) => !['--keep-data', '--headed', '--debug'].includes(arg));

const providedDataDir = process.env.GREMIA_SBV_E2E_DATA_DIR || '';
const dataDir = providedDataDir || mkdtempSync(join(tmpdir(), 'gremia-sbv-e2e-'));
if (!isSafeE2eDir(dataDir)) {
  console.error(`E2E-Schutzabbruch: Datenverzeichnis ist nicht als temporäre Testumgebung erlaubt: ${dataDir}`);
  console.error('Setze GREMIA_SBV_E2E_DATA_DIR nur auf ein Verzeichnis unter dem System-Temp mit Präfix gremia-sbv-e2e-.');
  process.exit(2);
}
mkdirSync(dataDir, { recursive: true });

const playwrightBin = assertLocalPlaywrightInstalled();
const outputDir = join(dataDir, 'playwright-output');
const env = {
  ...process.env,
  GREMIA_SBV_E2E: '1',
  GREMIA_SBV_E2E_DATA_DIR: dataDir,
  GREMIA_SBV_DATA_DIR: dataDir,
  PLAYWRIGHT_HTML_REPORT: join(dataDir, 'playwright-report'),
  PLAYWRIGHT_TEST_OUTPUT_DIR: outputDir,
};

const playwrightArgs = ['test', ...passThrough];
if (headed && !playwrightArgs.includes('--headed')) playwrightArgs.push('--headed');
if (debug && !playwrightArgs.includes('--debug')) playwrightArgs.push('--debug');

console.log(`E2E-Testumgebung: ${dataDir}`);
console.log('E2E-Schutz: GREMIA_SBV_DATA_DIR zeigt ausschließlich auf diese temporäre Testumgebung.');
const result = spawnSync(playwrightBin, playwrightArgs, { stdio: 'inherit', env, shell: process.platform === 'win32' });

if (!keep && !providedDataDir) {
  rmSync(dataDir, { recursive: true, force: true });
} else {
  console.log(`E2E-Testdaten beibehalten: ${dataDir}`);
}

process.exit(result.status ?? 1);
