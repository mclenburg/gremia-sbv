#!/usr/bin/env node
/*
 * Gremia.SBV source cleanup helper.
 *
 * Removes obsolete source files listed by patch manifests before a build.
 * The script is intentionally conservative: only explicit relative paths under
 * the project root are accepted; wildcards, absolute paths and parent traversal
 * are rejected.
 */
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const defaultManifestDir = path.join(projectRoot, 'maintenance', 'source-cleanup');
const dryRun = process.argv.includes('--dry-run');
const explicitManifests = process.argv
  .slice(2)
  .filter((arg) => arg !== '--dry-run')
  .map((arg) => path.resolve(projectRoot, arg));

const protectedTopLevel = new Set([
  '.',
  '',
  'node_modules',
  'dist',
  'dist-electron',
  'release',
  '.git',
  '.idea',
  '.vscode',
]);

const allowedTopLevel = new Set([
  'src',
  'services',
  'electron',
  'database',
  'scripts',
  'tests',
  'docs',
  'assets',
]);

function loadManifestPaths() {
  if (explicitManifests.length > 0) {
    return explicitManifests;
  }

  if (!fs.existsSync(defaultManifestDir)) {
    return [];
  }

  return fs.readdirSync(defaultManifestDir)
    .filter((entry) => entry.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b))
    .map((entry) => path.join(defaultManifestDir, entry));
}

function parseManifest(manifestPath) {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const data = JSON.parse(raw);
  const files = Array.isArray(data.files) ? data.files : [];
  const directories = Array.isArray(data.directories) ? data.directories : [];
  return { files, directories, manifestPath };
}

function assertSafeRelativePath(relativePath, kind, manifestPath) {
  if (typeof relativePath !== 'string' || relativePath.trim() === '') {
    throw new Error(`Ungültiger ${kind}-Eintrag in ${manifestPath}: ${String(relativePath)}`);
  }

  if (relativePath.includes('*')) {
    throw new Error(`Wildcards sind aus Sicherheitsgründen nicht erlaubt: ${relativePath}`);
  }

  if (path.isAbsolute(relativePath)) {
    throw new Error(`Absolute Pfade sind nicht erlaubt: ${relativePath}`);
  }

  const normalized = path.normalize(relativePath).replaceAll('\\\\', '/');
  if (normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`Pfade außerhalb des Projekt-Roots sind nicht erlaubt: ${relativePath}`);
  }

  const [topLevel] = normalized.split('/');
  if (protectedTopLevel.has(topLevel)) {
    throw new Error(`Geschützter Pfad darf nicht per Cleanup entfernt werden: ${relativePath}`);
  }

  if (!allowedTopLevel.has(topLevel)) {
    throw new Error(`Cleanup-Pfad muss in einem bekannten Source-/Projektbereich liegen: ${relativePath}`);
  }

  const absolutePath = path.resolve(projectRoot, normalized);
  const relativeToRoot = path.relative(projectRoot, absolutePath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error(`Pfad verlässt Projekt-Root: ${relativePath}`);
  }

  return { normalized, absolutePath };
}

function removeFile(relativePath, manifestPath, result) {
  const { normalized, absolutePath } = assertSafeRelativePath(relativePath, 'Datei', manifestPath);
  if (!fs.existsSync(absolutePath)) {
    result.skipped.push(normalized);
    return;
  }
  const stat = fs.statSync(absolutePath);
  if (!stat.isFile()) {
    throw new Error(`Als Datei gelistet, aber keine Datei: ${normalized}`);
  }
  result.removed.push(normalized);
  if (!dryRun) {
    fs.unlinkSync(absolutePath);
  }
}

function removeDirectory(relativePath, manifestPath, result) {
  const { normalized, absolutePath } = assertSafeRelativePath(relativePath, 'Verzeichnis', manifestPath);
  if (!fs.existsSync(absolutePath)) {
    result.skipped.push(normalized);
    return;
  }
  const stat = fs.statSync(absolutePath);
  if (!stat.isDirectory()) {
    throw new Error(`Als Verzeichnis gelistet, aber kein Verzeichnis: ${normalized}`);
  }
  result.removed.push(`${normalized}/`);
  if (!dryRun) {
    fs.rmSync(absolutePath, { recursive: true, force: true });
  }
}

function main() {
  const manifestPaths = loadManifestPaths();
  const result = { removed: [], skipped: [] };

  for (const manifestPath of manifestPaths) {
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Cleanup-Manifest nicht gefunden: ${manifestPath}`);
    }
    const { files, directories } = parseManifest(manifestPath);
    directories.forEach((entry) => removeDirectory(entry, manifestPath, result));
    files.forEach((entry) => removeFile(entry, manifestPath, result));
  }

  const mode = dryRun ? 'Trockenlauf' : 'Cleanup';
  console.log(`Source-${mode}: ${result.removed.length} entfernt, ${result.skipped.length} nicht vorhanden.`);
  if (result.removed.length > 0) {
    console.log(`Entfernt: ${result.removed.join(', ')}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
