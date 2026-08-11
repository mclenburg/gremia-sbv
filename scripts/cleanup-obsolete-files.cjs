#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const projectRoot = path.resolve(__dirname, '..');
const manifestDir = path.join(projectRoot, 'maintenance', 'source-cleanup');
const consolidatedManifest = path.join(manifestDir, 'cleanup-manifest.json');
const dryRun = process.argv.includes('--dry-run') || process.argv.includes('--plan');
const verbose = process.argv.includes('--verbose');
const strictDelete = process.argv.includes('--strict-delete');
const explicitManifests = process.argv.slice(2)
  .filter((arg) => !['--dry-run', '--plan', '--verbose', '--strict-delete'].includes(arg))
  .map((arg) => path.resolve(projectRoot, arg));

const protectedTopLevel = new Set(['.', '', 'node_modules', 'dist', 'dist-electron', 'release', '.git', '.idea', '.vscode']);
const allowedTopLevel = new Set([
  'src', 'services', 'electron', 'database', 'scripts', 'tests', 'docs', 'assets', 'maintenance', 'e2e',
  'PATCH_NOTES_0.9.1_MEASURE_NOTES.md', 'PATCH_NOTES_0.9.1_MEASURE_NOTES_TS_FIX.md',
  'PATCH_NOTES_0.9.1_PERSONENBINDUNG.md', 'PATCH_0_9_3_A_ACTIVITY_JOURNAL.md',
  'PATCH_0_9_3_A_R1_ACTIVITY_JOURNAL_ARCHITECTURE.md', 'PATCH_0_9_3_A_R2_RECOVERY_LOGIN.md',
  'PATCH_0_9_3_A_R3_BUILD_FIXES.md', 'CHANGELOG.md', 'PATCH-1-TECHNICAL-REPORT.md',
]);
const referenceFiles = ['package.json', '.github', 'scripts', 'tests'];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function loadManifestPaths() {
  if (explicitManifests.length > 0) return explicitManifests;
  if (fs.existsSync(consolidatedManifest)) return [consolidatedManifest];
  if (!fs.existsSync(manifestDir)) return [];
  return fs.readdirSync(manifestDir).filter((entry) => entry.endsWith('.json')).sort()
    .map((entry) => path.join(manifestDir, entry));
}

function normalizeEntry(entry, type) {
  if (typeof entry === 'string') return { path: entry, type };
  if (!entry || typeof entry !== 'object') throw new Error(`Ungültiger Cleanup-Eintrag: ${String(entry)}`);
  return { path: entry.path, type: entry.type || type, sha256: entry.sha256 };
}

function parseManifest(manifestPath) {
  const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = Array.isArray(data.entries)
    ? data.entries.map((entry) => normalizeEntry(entry))
    : [
        ...(Array.isArray(data.files) ? data.files.map((entry) => normalizeEntry(entry, 'file')) : []),
        ...(Array.isArray(data.directories) ? data.directories.map((entry) => normalizeEntry(entry, 'directory')) : []),
      ];
  return { entries, manifestPath };
}

function assertSafeRelativePath(relativePath, kind, manifestPath) {
  if (typeof relativePath !== 'string' || relativePath.trim() === '') throw new Error(`Ungültiger ${kind}-Eintrag in ${manifestPath}`);
  if (relativePath.includes('*')) throw new Error(`Wildcards sind nicht erlaubt: ${relativePath}`);
  if (path.isAbsolute(relativePath)) throw new Error(`Absolute Pfade sind nicht erlaubt: ${relativePath}`);
  const normalized = path.normalize(relativePath).replaceAll('\\', '/');
  if (normalized === '..' || normalized.startsWith('../')) throw new Error(`Pfad verlässt Projekt-Root: ${relativePath}`);
  const [topLevel] = normalized.split('/');
  if (protectedTopLevel.has(topLevel)) throw new Error(`Geschützter Pfad: ${relativePath}`);
  if (!allowedTopLevel.has(topLevel)) throw new Error(`Unbekannter Cleanup-Bereich: ${relativePath}`);
  const absolutePath = path.resolve(projectRoot, normalized);
  const relativeToRoot = path.relative(projectRoot, absolutePath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) throw new Error(`Pfad verlässt Projekt-Root: ${relativePath}`);
  return { normalized, absolutePath };
}

function walkFiles(startPath) {
  if (!fs.existsSync(startPath)) return [];
  const stat = fs.lstatSync(startPath);
  if (stat.isSymbolicLink()) return [];
  if (stat.isFile()) return [startPath];
  if (!stat.isDirectory()) return [];
  return fs.readdirSync(startPath).flatMap((entry) => walkFiles(path.join(startPath, entry)));
}

function isScheduledForCleanup(filePath, cleanupScope) {
  const relativePath = path.relative(projectRoot, filePath).replaceAll('\\', '/');
  if (cleanupScope.files.has(relativePath)) return true;
  return cleanupScope.directories.some((directory) => relativePath === directory || relativePath.startsWith(`${directory}/`));
}

function findReferences(normalized, manifestPath, cleanupScope) {
  const extension = path.extname(normalized);
  const extensionless = extension ? normalized.slice(0, -extension.length) : normalized;
  // References must point to the obsolete path, not merely reuse the same basename.
  // References originating from another cleanup target are irrelevant because that
  // source disappears in the same validated cleanup transaction.
  const needles = new Set([
    normalized,
    normalized.replaceAll('/', path.sep),
    extensionless,
    extensionless.replaceAll('/', path.sep),
  ]);
  const references = [];
  for (const relativeStart of referenceFiles) {
    const absoluteStart = path.join(projectRoot, relativeStart);
    for (const filePath of walkFiles(absoluteStart)) {
      if (filePath === manifestPath || filePath === path.resolve(__filename)) continue;
      if (isScheduledForCleanup(filePath, cleanupScope)) continue;
      const ext = path.extname(filePath).toLowerCase();
      if (!['.json', '.js', '.cjs', '.mjs', '.ts', '.tsx', '.yml', '.yaml', '.md'].includes(ext)) continue;
      let content;
      try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }
      if ([...needles].some((needle) => needle.length > 2 && content.includes(needle))) {
        references.push(path.relative(projectRoot, filePath).replaceAll('\\', '/'));
      }
    }
  }
  return [...new Set(references)].sort();
}

function validateEntry(entry, manifestPath, cleanupScope) {
  if (!['file', 'directory'].includes(entry.type)) throw new Error(`Ungültiger Dateityp für ${entry.path}: ${String(entry.type)}`);
  const resolved = assertSafeRelativePath(entry.path, entry.type, manifestPath);
  if (!fs.existsSync(resolved.absolutePath)) return { ...resolved, exists: false };
  const stat = fs.lstatSync(resolved.absolutePath);
  if (stat.isSymbolicLink()) throw new Error(`Symlink wird nicht gelöscht: ${resolved.normalized}`);
  if (entry.type === 'file' && !stat.isFile()) throw new Error(`Als Datei gelistet, aber keine Datei: ${resolved.normalized}`);
  if (entry.type === 'directory' && !stat.isDirectory()) throw new Error(`Als Verzeichnis gelistet, aber kein Verzeichnis: ${resolved.normalized}`);
  if (entry.sha256) {
    if (entry.type !== 'file') throw new Error(`SHA-256 ist nur für Dateien zulässig: ${resolved.normalized}`);
    const actual = sha256(resolved.absolutePath);
    if (actual !== entry.sha256) throw new Error(`Unerwarteter Inhalt; SHA-256 weicht ab: ${resolved.normalized}`);
  }
  const references = findReferences(resolved.normalized, manifestPath, cleanupScope);
  if (references.length > 0) throw new Error(`Cleanup-Ziel wird noch referenziert: ${resolved.normalized} (${references.join(', ')})`);
  return { ...resolved, exists: true };
}

function main() {
  const manifestPaths = loadManifestPaths();
  const records = [];
  const seen = new Set();

  for (const manifestPath of manifestPaths) {
    if (!fs.existsSync(manifestPath)) throw new Error(`Cleanup-Manifest nicht gefunden: ${manifestPath}`);
    const { entries } = parseManifest(manifestPath);
    for (const entry of entries) {
      const key = `${entry.type}:${entry.path}`;
      if (seen.has(key)) throw new Error(`Doppelter Cleanup-Eintrag: ${entry.path}`);
      seen.add(key);
      records.push({ entry, manifestPath });
    }
  }

  // Build the complete cleanup scope before reference validation. This is essential
  // for relocations where obsolete tests reference other obsolete tests: references
  // from files that will disappear in the same cleanup transaction must not block it.
  const cleanupScope = { files: new Set(), directories: [] };
  for (const { entry, manifestPath } of records) {
    const resolved = assertSafeRelativePath(entry.path, entry.type, manifestPath);
    if (entry.type === 'directory') cleanupScope.directories.push(resolved.normalized);
    else cleanupScope.files.add(resolved.normalized);
  }
  cleanupScope.directories.sort();

  // Preflight every target before deleting anything. A late validation failure must
  // never leave a 200+ file relocation half-applied.
  const validated = records.map(({ entry, manifestPath }) => ({
    entry,
    target: validateEntry(entry, manifestPath, cleanupScope),
  }));

  const planned = [];
  const alreadyClean = [];
  for (const { entry, target } of validated) {
    const display = entry.type === 'directory' ? `${target.normalized}/` : target.normalized;
    if (!target.exists) alreadyClean.push(display);
    else planned.push({ entry, target, display });
  }

  console.log(dryRun ? 'Cleanup-Plan:' : 'Source-Cleanup:');
  if (dryRun) {
    for (const item of planned) console.log(`  WOULD DELETE ${item.display}`);
    if (verbose) for (const entry of alreadyClean) console.log(`  ALREADY CLEAN ${entry}`);
    console.log(`${planned.length} Ziel(e), ${alreadyClean.length} bereits entfernt, 0 Fehler.`);
    return;
  }

  const failed = [];
  for (const { entry, target, display } of planned) {
    try {
      if (entry.type === 'directory') fs.rmSync(target.absolutePath, { recursive: true, force: false, maxRetries: 3, retryDelay: 100 });
      else fs.unlinkSync(target.absolutePath);
      console.log(`  DELETED ${display}`);
    } catch (error) {
      failed.push({ path: display, reason: error instanceof Error ? error.message : String(error) });
      if (strictDelete) throw error;
    }
  }
  if (verbose) for (const entry of alreadyClean) console.log(`  ALREADY CLEAN ${entry}`);
  for (const entry of failed) console.error(`  FAILED ${entry.path}: ${entry.reason}`);
  console.log(`${planned.length} Ziel(e), ${alreadyClean.length} bereits entfernt, ${failed.length} Fehler.`);
  if (failed.length > 0) process.exitCode = 1;
}

try { main(); } catch (error) {
  console.error(`Source-Cleanup abgebrochen: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
