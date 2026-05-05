#!/usr/bin/env node
/*
 * Gremia.SBV source cleanup helper.
 *
 * Removes obsolete source files listed by patch manifests before a build or test
 * run. The script is intentionally conservative: only explicit relative paths
 * under the project root are accepted; wildcards, absolute paths and parent
 * traversal are rejected.
 *
 * Windows note:
 * Obsolete files can occasionally be locked by an editor, antivirus scanner or
 * npm itself. Cleanup must not make the whole build unusable in that case.
 * Unsafe paths still fail hard; deletion failures are reported as warnings and
 * can be investigated later.
 */
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const defaultManifestDir = path.join(projectRoot, 'maintenance', 'source-cleanup');
const dryRun = process.argv.includes('--dry-run');
const verbose = process.argv.includes('--verbose');
const strictDelete = process.argv.includes('--strict-delete');
const explicitManifests = process.argv
  .slice(2)
  .filter((arg) => arg !== '--dry-run' && arg !== '--verbose' && arg !== '--strict-delete')
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
  'maintenance',
  'e2e',
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

function markDeletionFailure(result, normalized, error) {
  const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  result.failed.push({ path: normalized, reason });
  if (strictDelete) {
    throw error;
  }
}

function makeWritable(targetPath) {
  try {
    fs.chmodSync(targetPath, 0o666);
  } catch {
    // Best effort only. chmod is not reliable on Windows for every file type.
  }
}

function removeFile(relativePath, manifestPath, result) {
  const { normalized, absolutePath } = assertSafeRelativePath(relativePath, 'Datei', manifestPath);
  if (!fs.existsSync(absolutePath)) {
    result.alreadyClean.push(normalized);
    return;
  }
  const stat = fs.statSync(absolutePath);
  if (!stat.isFile()) {
    throw new Error(`Als Datei gelistet, aber keine Datei: ${normalized}`);
  }

  if (dryRun) {
    result.removed.push(normalized);
    return;
  }

  try {
    makeWritable(absolutePath);
    fs.unlinkSync(absolutePath);
    result.removed.push(normalized);
  } catch (error) {
    markDeletionFailure(result, normalized, error);
  }
}

function removeDirectory(relativePath, manifestPath, result) {
  const { normalized, absolutePath } = assertSafeRelativePath(relativePath, 'Verzeichnis', manifestPath);
  const displayPath = `${normalized}/`;
  if (!fs.existsSync(absolutePath)) {
    result.alreadyClean.push(displayPath);
    return;
  }
  const stat = fs.statSync(absolutePath);
  if (!stat.isDirectory()) {
    throw new Error(`Als Verzeichnis gelistet, aber kein Verzeichnis: ${normalized}`);
  }

  if (dryRun) {
    result.removed.push(displayPath);
    return;
  }

  try {
    fs.rmSync(absolutePath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    if (fs.existsSync(absolutePath)) {
      throw new Error('Verzeichnis ist nach Löschversuch weiterhin vorhanden');
    }
    result.removed.push(displayPath);
  } catch (error) {
    markDeletionFailure(result, displayPath, error);
  }
}

function main() {
  const manifestPaths = loadManifestPaths();
  const result = { removed: [], alreadyClean: [], failed: [] };

  for (const manifestPath of manifestPaths) {
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Cleanup-Manifest nicht gefunden: ${manifestPath}`);
    }
    const { files, directories } = parseManifest(manifestPath);
    directories.forEach((entry) => removeDirectory(entry, manifestPath, result));
    files.forEach((entry) => removeFile(entry, manifestPath, result));
  }

  const action = dryRun ? 'würde entfernt' : 'entfernt';
  if (result.removed.length === 0) {
    console.log('Source-Cleanup: nichts zu entfernen.');
  } else {
    console.log(`Source-Cleanup: ${result.removed.length} ${action}.`);
  }
  if (verbose && result.removed.length > 0) {
    console.log(`${dryRun ? 'Würde entfernen' : 'Entfernt'}: ${result.removed.join(', ')}`);
  }
  if (verbose && result.alreadyClean.length > 0) {
    console.log(`Bereits bereinigt: ${result.alreadyClean.join(', ')}`);
  }
  if (result.failed.length > 0) {
    console.warn(
      `Source-Cleanup: ${result.failed.length} Datei(en)/Verzeichnis(se) konnten nicht entfernt werden; Build läuft weiter.`
    );
    if (verbose) {
      for (const failure of result.failed) {
        console.warn(`Nicht entfernt: ${failure.path} – ${failure.reason}`);
      }
    }
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
