#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const os = require('node:os');

function hasFlag(name) {
  return process.argv.slice(2).includes(name);
}

const dryRun = hasFlag('--dry-run');

function currentPlatformBuildScript() {
  if (process.platform === 'win32') return 'build:package:windows';
  if (process.platform === 'darwin') return 'build:package:mac';
  return 'build:package:linux';
}

function currentPlatformReleaseScript() {
  if (process.platform === 'win32') return 'release:platform:windows';
  if (process.platform === 'linux') return 'release:platform:linux';
  return null;
}

function npmRun(scriptName) {
  return ['npm', ['run', scriptName]];
}

function buildSequence() {
  const sequence = [
    ['npm', ['ci']],
    npmRun('security:audit'),
    npmRun('licenses:generate'),
    npmRun('licenses:check'),
    npmRun('build:verify'),
    npmRun('build:compile'),
    npmRun(currentPlatformBuildScript()),
  ];
  const releaseScript = currentPlatformReleaseScript();
  if (releaseScript) sequence.push(npmRun(releaseScript));
  return sequence;
}

function run(command, args, options = {}) {
  const label = [command, ...args].join(' ');
  console.log(`\n▶ ${label}`);
  if (dryRun) return;
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runGithubBuildCurrentOs() {
  console.log('Gremia.SBV GitHub-Build lokal – aktuelles OS');
  console.log(`Plattform: ${process.platform} (${os.release()})`);
  console.log('Sequenz: npm ci → security:audit → licenses:generate/check → verify → compile → package → platform release checks');
  console.log('Hinweis: Dieser Befehl spiegelt den GitHub-Build nur für das aktuelle Betriebssystem. Er ersetzt keinen Cross-OS-Lauf für Windows, macOS und Linux.');
  console.log('Performance: E2E-Tests laufen standardmäßig mit 2 Workern; bei Bedarf GREMIA_SBV_E2E_WORKERS=1 setzen.');
  if (process.platform === 'linux') {
    console.log('Linux-Hinweis: Der GitHub-Runner installiert libarchive-tools/bsdtar vor dem Paketbuild. Lokal muss diese Abhängigkeit im System vorhanden sein.');
  }
  if (dryRun) {
    console.log('Dry-Run: Befehle werden nur ausgegeben, nicht ausgeführt.');
  }

  for (const [command, args] of buildSequence()) {
    run(command, args);
  }

  console.log(dryRun ? '\nGitHub-Build-Sequenz für das aktuelle OS wurde im Dry-Run vollständig ausgegeben.' : '\nGitHub-Build-Sequenz für das aktuelle OS erfolgreich abgeschlossen.');
}

if (require.main === module) {
  runGithubBuildCurrentOs();
}

module.exports = { buildSequence, currentPlatformBuildScript, currentPlatformReleaseScript, npmRun, runGithubBuildCurrentOs };
