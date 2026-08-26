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
const canonicalTarget = target === 'windows' ? 'win' : target;
const receiptPath = path.join(releaseDir, `.gremia-sbv-${canonicalTarget}-artifact.json`);
let receipt;
try {
  receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
} catch (error) {
  console.error(`Startup-Smoke-Test kann den verifizierten Buildbeleg nicht lesen: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(3);
}
if (receipt?.version !== 2 || receipt?.target !== canonicalTarget || !Array.isArray(receipt.artifacts)) {
  console.error('Startup-Smoke-Test erhielt einen ungültigen oder plattformfremden Buildbeleg.');
  process.exit(3);
}
const startupArtifacts = receipt.artifacts
  .map((entry) => typeof entry?.artifact === 'string' ? entry.artifact : '')
  .filter((name) => name.endsWith(extension))
  .filter((name) => canonicalTarget !== 'win' || /-win-x64-portable\.exe$/i.test(name))
  .map((name) => path.join(releaseDir, path.basename(name)));
if (startupArtifacts.length !== 1) {
  console.error(`Startup-Smoke-Test erwartet genau ein startbares ${extension}-Artefakt im aktuellen Buildbeleg, gefunden: ${startupArtifacts.length}.`);
  process.exit(3);
}
if (!fs.existsSync(startupArtifacts[0])) {
  console.error(`Startup-Smoke-Test findet das im aktuellen Buildbeleg verzeichnete Artefakt nicht: ${path.basename(startupArtifacts[0])}.`);
  process.exit(3);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-sbv-startup-smoke-'));
const longSegment = 'langer-pfad-'.repeat(9);
const dataDirectory = path.join(root, 'Pfad mit Leerzeichen und Ümlauten', longSegment, 'Daten');
const marker = path.join(root, 'startup-ok.json');
fs.mkdirSync(dataDirectory, { recursive: true });

const artifact = startupArtifacts[0];
if (target === 'linux') fs.chmodSync(artifact, 0o755);
if (target === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
  fs.rmSync(root, { recursive: true, force: true });
  console.warn('Startup-Smoke-Test übersprungen: Linux-Desktoptest benötigt DISPLAY, WAYLAND_DISPLAY oder xvfb-run. GitHub führt diesen Schritt mit xvfb-run aus.');
  process.exit(0);
}
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
