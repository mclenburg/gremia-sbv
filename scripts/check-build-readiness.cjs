#!/usr/bin/env node
/*
 * Gremia.SBV build readiness guard.
 *
 * Lightweight dependency-free checks that run after version generation and
 * source cleanup. The guard intentionally checks only stable release-safety
 * contracts that do not require node_modules.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const strict = process.argv.includes('--strict');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function fail(message) {
  throw new Error(message);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractVersionFromGenerated(relativePath) {
  const match = read(relativePath).match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  return match ? match[1] : null;
}

function extractSchemaVersion() {
  const match = read('services/appSchema.ts').match(/APP_SCHEMA_VERSION\s*=\s*["'](\d{4})["']/);
  return match ? match[1] : null;
}

function highestMigrationVersion() {
  const migrationDir = path.join(root, 'database', 'migrations');
  const versions = fs.readdirSync(migrationDir)
    .map((entry) => entry.match(/^(\d{4})_/))
    .filter(Boolean)
    .map((match) => match[1])
    .sort();
  return versions.at(-1) ?? null;
}

function validatePostinstall(pkg) {
  expect(pkg.scripts, 'package.json enthält keine scripts.');
  expect(
    pkg.scripts.postinstall === 'electron-builder install-app-deps',
    'package.json muss "postinstall": "electron-builder install-app-deps" enthalten, damit native Dependencies zur Electron-Version passen.'
  );
  expect(
    pkg.scripts['native:install-app-deps'] === 'electron-builder install-app-deps',
    'package.json muss native:install-app-deps als expliziten wiederverwendbaren Alias enthalten.'
  );
}

function validateVersions(pkg) {
  const rendererVersion = extractVersionFromGenerated('src/app/generated/appVersion.ts');
  const serviceVersion = extractVersionFromGenerated('services/generated/appMetadata.ts');
  expect(rendererVersion === pkg.version, `Renderer-Version ${rendererVersion} passt nicht zu package.json ${pkg.version}.`);
  expect(serviceVersion === pkg.version, `Service-Version ${serviceVersion} passt nicht zu package.json ${pkg.version}.`);
}

function validateSchemaVersion() {
  const schemaVersion = extractSchemaVersion();
  const latestMigration = highestMigrationVersion();
  expect(schemaVersion !== null, 'services/appSchema.ts enthält keine APP_SCHEMA_VERSION.');
  expect(latestMigration !== null, 'database/migrations enthält keine Migrationen.');
  expect(
    schemaVersion === latestMigration,
    `APP_SCHEMA_VERSION ${schemaVersion} passt nicht zur letzten Migration ${latestMigration}.`
  );
}

function validateCleanup(pkg) {
  expect(pkg.scripts['source:cleanup'] === 'node scripts/cleanup-obsolete-files.cjs', 'source:cleanup Script fehlt oder ist verändert.');
  expect(pkg.scripts['source:cleanup:dry-run'] === 'node scripts/cleanup-obsolete-files.cjs --dry-run', 'source:cleanup:dry-run Script fehlt oder ist verändert.');
  expect(
    pkg.scripts.prebuild === 'npm run version:generate && npm run source:cleanup && npm run build:readiness',
    'prebuild muss Versionserzeugung, Source-Cleanup und Build-Readiness-Guard in dieser Reihenfolge ausführen.'
  );
}

function validateCleanupManifests() {
  const manifestDir = path.join(root, 'maintenance', 'source-cleanup');
  if (!fs.existsSync(manifestDir)) return;
  const manifests = fs.readdirSync(manifestDir).filter((entry) => entry.endsWith('.json'));
  for (const entry of manifests) {
    const manifest = readJson(path.join('maintenance', 'source-cleanup', entry));
    expect(typeof manifest.version === 'string' && manifest.version.length > 0, `${entry}: version fehlt.`);
    expect(Array.isArray(manifest.files), `${entry}: files muss ein Array sein.`);
    expect(Array.isArray(manifest.directories), `${entry}: directories muss ein Array sein.`);
  }
}

function validateStrictBuildArtifacts() {
  if (!strict) return;
  const required = [
    'scripts/build-linux-appimage.sh',
    'scripts/write-electron-cjs-package.cjs',
    'electron/main.ts',
    'electron/preload.ts',
    'vite.config.ts',
    'tsconfig.json',
    'tsconfig.electron.json',
  ];
  for (const relativePath of required) {
    expect(fs.existsSync(path.join(root, relativePath)), `Build-Artefakt fehlt: ${relativePath}`);
  }
}

function main() {
  const pkg = readJson('package.json');
  validatePostinstall(pkg);
  validateVersions(pkg);
  validateSchemaVersion();
  validateCleanup(pkg);
  validateCleanupManifests();
  validateStrictBuildArtifacts();
  console.log(`Build-Readiness OK: ${pkg.name}@${pkg.version}, Schema ${extractSchemaVersion()}.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
