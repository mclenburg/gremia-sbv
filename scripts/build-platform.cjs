#!/usr/bin/env node
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const target = (process.argv[2] || '').toLowerCase();
const allowCross = process.argv.includes('--allow-cross') || process.env.GREMIA_SBV_ALLOW_CROSS_BUILD === '1';

const TARGETS = {
  linux: {
    os: 'linux',
    label: 'Linux AppImage',
    builderArgs: ['--linux', 'AppImage'],
    supportedPlatforms: ['linux'],
    artifactHint: 'release/Gremia.SBV-<version>-linux-<arch>.AppImage'
  },
  win: {
    os: 'win',
    label: 'Windows portable x64 EXE',
    builderArgs: ['--win', 'portable', '--x64'],
    supportedPlatforms: ['win32'],
    artifactHint: 'release/Gremia.SBV-<version>-win-x64.exe'
  },
  windows: {
    os: 'win',
    label: 'Windows portable x64 EXE',
    builderArgs: ['--win', 'portable', '--x64'],
    supportedPlatforms: ['win32'],
    artifactHint: 'release/Gremia.SBV-<version>-win-x64.exe'
  },
  mac: {
    os: 'mac',
    label: 'macOS DMG',
    builderArgs: ['--mac', 'dmg'],
    supportedPlatforms: ['darwin'],
    artifactHint: 'release/Gremia.SBV-<version>-mac-<arch>.dmg'
  }
};

function usage() {
  console.error('Nutzung: node scripts/build-platform.cjs <linux|win|mac> [--allow-cross]');
}

function command(name) {
  return process.platform === 'win32' ? `${name}.cmd` : name;
}

function localBin(name) {
  return process.platform === 'win32'
    ? join(process.cwd(), 'node_modules', '.bin', `${name}.cmd`)
    : join(process.cwd(), 'node_modules', '.bin', name);
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runNodeScript(script, args = []) {
  run(process.execPath, [script, ...args], { shell: false });
}

function runNpmScript(script) {
  const npmCli = process.env.npm_execpath;
  if (npmCli) {
    run(process.execPath, [npmCli, 'run', script], { shell: false });
    return;
  }
  run(command('npm'), ['run', script]);
}

const selected = TARGETS[target];
if (!selected) {
  usage();
  process.exit(2);
}

if (!selected.supportedPlatforms.includes(process.platform) && !allowCross) {
  console.error(`Build-Abbruch: ${selected.label} wird für die RC-Abnahme auf ${selected.supportedPlatforms.join(', ')} gebaut.`);
  console.error(`Aktuelles System: ${process.platform}.`);
  console.error('Nutze für echte Abnahme das Zielsystem selbst:');
  console.error('  Linux:   npm run build:linux');
  console.error('  Windows: npm run build:win');
  console.error('  macOS:   npm run build:mac');
  console.error('Cross-Builds sind bewusst nicht Standard. Für Diagnosezwecke: GREMIA_SBV_ALLOW_CROSS_BUILD=1 oder --allow-cross.');
  process.exit(3);
}

const electronBuilder = localBin('electron-builder');
if (!existsSync(electronBuilder)) {
  console.error('Build-Abbruch: electron-builder ist nicht lokal installiert. Bitte zuerst ausführen: npm install');
  process.exit(4);
}

console.log(`Baue Gremia.SBV für ${selected.label} ...`);
console.log(`Plattform: ${process.platform}, Node: ${process.version}`);

runNpmScript('build:app');
runNpmScript('native:rebuild:electron');
runNodeScript('scripts/run-electron-builder.cjs', selected.builderArgs);

console.log('');
console.log('Fertig. Artefakte liegen unter:');
console.log(`  ${join(process.cwd(), 'release')}`);
console.log('Erwartet etwa:');
console.log(`  ${selected.artifactHint}`);
