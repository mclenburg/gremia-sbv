#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const { resolveE2ePackage } = require('./e2e-tools.cjs');

function resolvePlaywrightCli() {
  try {
    return resolveE2ePackage('playwright/cli');
  } catch (playwrightError) {
    try {
      return resolveE2ePackage('@playwright/test/cli');
    } catch {
      console.error('E2E-Browserinstallation abgebrochen: Playwright ist nicht in der isolierten E2E-Werkzeugumgebung installiert.');
      console.error('Playwright ist bewusst nicht Teil der Standardinstallation und wird außerhalb der App-node_modules installiert, damit normale Builds und electron-builder-Pakete sauber bleiben.');
      console.error('Für E2E-Tests bitte explizit ausführen:');
      console.error('  npm run test:e2e:setup');
      console.error(`Auflösungsfehler: ${playwrightError instanceof Error ? playwrightError.message : String(playwrightError)}`);
      process.exit(3);
    }
  }
}

function browserInstallArgs(platform = process.platform, isCi = Boolean(process.env.CI)) {
  const args = ['install'];
  if (platform === 'linux' && isCi) {
    args.push('--with-deps');
  }
  args.push('chromium');
  return args;
}

function run() {
  const playwrightCli = resolvePlaywrightCli();
  const args = browserInstallArgs();
  console.log(`Installiere Playwright-Browser isoliert: ${process.execPath} ${playwrightCli} ${args.join(' ')}`);
  const result = spawnSync(process.execPath, [playwrightCli, ...args], {
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    console.error(`E2E-Browserinstallation konnte Playwright nicht starten: ${result.error.message}`);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

if (require.main === module) {
  run();
}

module.exports = {
  browserInstallArgs,
  resolvePlaywrightCli,
};
