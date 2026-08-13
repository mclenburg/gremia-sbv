#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const target = (process.argv[2] || '').toLowerCase();
const extension = target === 'linux' ? '.AppImage' : (target === 'win' || target === 'windows' ? '.exe' : null);
if (!extension) {
  console.error('Nutzung: node scripts/run-packaged-startup-smoke.cjs <linux|win>');
  process.exit(2);
}

const releaseDir = path.join(process.cwd(), 'release');
const artifacts = fs.existsSync(releaseDir)
  ? fs.readdirSync(releaseDir).filter((name) => name.endsWith(extension)).map((name) => path.join(releaseDir, name))
  : [];
const startupArtifacts = target === 'win' || target === 'windows'
  ? artifacts.filter((artifact) => /-win-x64-portable\.exe$/i.test(path.basename(artifact)))
  : artifacts;
if (startupArtifacts.length !== 1) {
  console.error(`Startup-Smoke-Test erwartet genau ein startbares ${extension}-Artefakt, gefunden: ${startupArtifacts.length}.`);
  process.exit(3);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-sbv-startup-smoke-'));
const longSegment = 'langer-pfad-'.repeat(9);
const dataDirectory = path.join(root, 'Pfad mit Leerzeichen und Ümlauten', longSegment, 'Daten');
const marker = path.join(root, 'startup-ok.json');
fs.mkdirSync(dataDirectory, { recursive: true });

const artifact = startupArtifacts[0];
if (target === 'linux') fs.chmodSync(artifact, 0o755);
const env = {
  ...process.env,
  GREMIA_SBV_DATA_DIR: dataDirectory,
  GREMIA_SBV_STARTUP_SMOKE_MARKER: marker,
  ELECTRON_ENABLE_LOGGING: '1',
};
if (target === 'linux') env.APPIMAGE_EXTRACT_AND_RUN = '1';

const child = spawn(artifact, ['--startup-smoke-test'], {
  cwd: path.dirname(artifact),
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false,
  windowsHide: true,
});
let output = '';
child.stdout.on('data', (chunk) => { output += chunk.toString(); });
child.stderr.on('data', (chunk) => { output += chunk.toString(); });

const timeout = setTimeout(() => {
  child.kill('SIGKILL');
  console.error(`Startup-Smoke-Test überschritt 45 Sekunden.\n${output.slice(-4000)}`);
  process.exitCode = 4;
}, 45_000);

child.on('error', (error) => {
  clearTimeout(timeout);
  console.error(`Artefakt konnte nicht gestartet werden: ${error.message}`);
  process.exitCode = 5;
});

child.on('close', (code) => {
  clearTimeout(timeout);
  try {
    if (code !== 0) throw new Error(`Artefakt endete mit Exitcode ${String(code)}.\n${output.slice(-4000)}`);
    if (!fs.existsSync(marker)) throw new Error(`Startup-Marker fehlt.\n${output.slice(-4000)}`);
    const result = JSON.parse(fs.readFileSync(marker, 'utf8'));
    if (result.ok !== true) throw new Error('Startup-Marker meldet keinen Erfolg.');
    if (path.normalize(result.dataDirectory) !== path.normalize(dataDirectory)) {
      throw new Error(`App verwendete unerwarteten Datenpfad: ${String(result.dataDirectory)}`);
    }
    console.log(`Startup-Smoke-Test OK: ${path.basename(artifact)} mit Leerzeichen-, Umlaut- und Langpfad.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 6;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
