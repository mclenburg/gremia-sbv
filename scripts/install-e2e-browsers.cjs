#!/usr/bin/env node
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

function localBin(name) {
  return process.platform === 'win32'
    ? join(process.cwd(), 'node_modules', '.bin', `${name}.cmd`)
    : join(process.cwd(), 'node_modules', '.bin', name);
}

const playwrightBin = localBin('playwright');
if (!existsSync(playwrightBin)) {
  console.error('E2E-Browserinstallation abgebrochen: Playwright ist lokal nicht installiert.');
  console.error('Playwright ist bewusst nicht Teil der Standardinstallation, damit normale Builds nicht an optionalen UI-Test-Abhängigkeiten scheitern.');
  console.error('Für E2E-Tests bitte explizit ausführen:');
  console.error('  npm run test:e2e:setup');
  process.exit(3);
}

const result = spawnSync(playwrightBin, ['install', 'chromium'], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
process.exit(result.status ?? 1);
