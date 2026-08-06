#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const stateDir = path.join(root, 'maintenance', 'build-state');
const statePath = path.join(stateDir, 'compiled-artifacts.json');
const artifactRoots = ['dist', 'dist-electron'];
const inputFiles = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.electron.json',
  'vite.config.ts',
  'electron-builder.yml',
].filter((entry) => fs.existsSync(path.join(root, entry)));
const inputDirectories = ['src', 'services', 'electron', 'database', 'assets'];

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function listFiles(relativeRoot) {
  const absoluteRoot = path.join(root, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const result = [];
  const stack = [absoluteRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symlink im Buildzustand nicht erlaubt: ${path.relative(root, absolutePath)}`);
      if (entry.isDirectory()) stack.push(absolutePath);
      else if (entry.isFile()) result.push(path.relative(root, absolutePath).replaceAll('\\', '/'));
    }
  }
  return result.sort((a, b) => a.localeCompare(b));
}

function snapshot(paths) {
  return paths.map((relativePath) => ({
    path: relativePath,
    size: fs.statSync(path.join(root, relativePath)).size,
    sha256: sha256File(path.join(root, relativePath)),
  }));
}

function sourceSnapshot() {
  const paths = [...inputFiles];
  for (const directory of inputDirectories) paths.push(...listFiles(directory));
  return snapshot([...new Set(paths)].sort((a, b) => a.localeCompare(b)));
}

function artifactSnapshot() {
  const paths = artifactRoots.flatMap(listFiles);
  if (paths.length === 0) throw new Error('Keine kompilierten Artefakte gefunden. Zuerst npm run build:compile ausführen.');
  return snapshot(paths);
}

function writeState() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const state = {
    schemaVersion: 1,
    packageVersion: packageJson.version,
    nodeMajor: Number(process.versions.node.split('.')[0]),
    sources: sourceSnapshot(),
    artifacts: artifactSnapshot(),
  };
  fs.mkdirSync(stateDir, { recursive: true });
  const tempPath = `${statePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tempPath, statePath);
  console.log(`Buildzustand geschrieben: ${path.relative(root, statePath)}`);
}

function compareEntries(label, expected, actual) {
  const expectedJson = JSON.stringify(expected);
  const actualJson = JSON.stringify(actual);
  if (expectedJson !== actualJson) {
    throw new Error(`${label} stimmen nicht mit dem geprüften Compile-Stand überein. Erneut npm run build:compile ausführen.`);
  }
}

function checkState() {
  if (!fs.existsSync(statePath)) throw new Error('Buildzustand fehlt. Zuerst npm run build:compile ausführen.');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  if (state.schemaVersion !== 1) throw new Error(`Unbekannte Buildzustands-Version: ${String(state.schemaVersion)}`);
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (state.packageVersion !== packageJson.version) throw new Error('Paketversion wurde seit dem Compile geändert.');
  compareEntries('Quellen und Buildkonfiguration', state.sources, sourceSnapshot());
  compareEntries('Kompilierte Artefakte', state.artifacts, artifactSnapshot());
  console.log('Buildzustand gültig: Packaging verwendet aktuelle, unveränderte Artefakte.');
}

const command = process.argv[2];
try {
  if (command === 'write') writeState();
  else if (command === 'check') checkState();
  else {
    console.error('Nutzung: node scripts/build-artifact-state.cjs <write|check>');
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`Buildzustand ungültig: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
