#!/usr/bin/env node
const { existsSync } = require('node:fs');
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

function shouldUseSystemChrome(env = process.env) {
  return env.GREMIA_SBV_E2E_USE_SYSTEM_CHROME === '1';
}

function systemChromeCandidates(platform = process.platform) {
  if (platform === 'win32') {
    return [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
  }
  if (platform === 'darwin') {
    return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  }
  return ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
}

function resolveSystemChrome(platform = process.platform) {
  return systemChromeCandidates(platform).find((candidate) => existsSync(candidate)) ?? null;
}

function browserInstallArgs(platform = process.platform, isCi = Boolean(process.env.CI), env = process.env) {
  const args = ['install'];
  if (platform === 'linux' && isCi && !shouldUseSystemChrome(env)) {
    args.push('--with-deps');
  }
  args.push('chromium');
  return args;
}

function run() {
  if (shouldUseSystemChrome()) {
    const chrome = resolveSystemChrome();
    if (!chrome) {
      console.error('E2E-Browserinstallation abgebrochen: System-Chrome wurde angefordert, aber kein Google-Chrome/Chromium-Binary gefunden.');
      console.error('Entweder GREMIA_SBV_E2E_USE_SYSTEM_CHROME entfernen oder auf dem Runner Google Chrome bereitstellen.');
      process.exit(4);
    }
    console.log(`Nutze vorhandenen System-Chrome für E2E-Tests: ${chrome}`);
    console.log('Playwright-Browserdownload wird bewusst übersprungen, um GitHub-Free-Minuten und Cache-/Netzlast zu sparen.');
    process.exit(0);
  }

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
  resolveSystemChrome,
  shouldUseSystemChrome,
  systemChromeCandidates,
};
