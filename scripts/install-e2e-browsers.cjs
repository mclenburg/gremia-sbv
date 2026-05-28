#!/usr/bin/env node
const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { e2eBin } = require('./e2e-tools.cjs');

const playwrightBin = e2eBin('playwright');
if (!existsSync(playwrightBin)) {
  console.error('E2E-Browserinstallation abgebrochen: Playwright ist nicht in der isolierten E2E-Werkzeugumgebung installiert.');
  console.error('Playwright ist bewusst nicht Teil der Standardinstallation und wird außerhalb der App-node_modules installiert, damit normale Builds und electron-builder-Pakete sauber bleiben.');
  console.error('Für E2E-Tests bitte explizit ausführen:');
  console.error('  npm run test:e2e:setup');
  process.exit(3);
}

const result = spawnSync(playwrightBin, ['install', 'chromium'], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
process.exit(result.status ?? 1);
