#!/usr/bin/env node
/*
 * Gremia.SBV release readiness check.
 *
 * Dependency-free static checks for the public baseline. This does not replace
 * npm run test/build; it catches broken release wiring, stale documentation
 * references and obsolete test scripts without forcing public docs to carry a
 * manually maintained product version.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function fail(message) {
  throw new Error(message);
}

function expect(condition, message) {
  if (!condition) fail(message);
}


function validatePackageVersion(pkg) {
  expect(/^\d+\.\d+\.\d+$/.test(pkg.version), `Öffentliche Builds benötigen eine stabile SemVer-Version ohne Arbeitsstand-Zusatz: ${pkg.version}`);
  const lock = readJson('package-lock.json');
  expect(lock.version === pkg.version, `package-lock.json Version ${lock.version} passt nicht zu package.json ${pkg.version}.`);
  expect(lock.packages?.['']?.version === pkg.version, `package-lock.json Root-Package-Version passt nicht zu package.json ${pkg.version}.`);
}

function validateReadme(pkg) {
  const readme = read('README.md');
  expect(!readme.includes(`Stand: **${pkg.version}**`), 'README.md darf keinen manuell gepflegten Paketstand ausweisen.');
  expect(!readme.includes('0.9.'), 'README.md darf keine voröffentliche Versionslinie enthalten.');
  for (const phrase of [
    'Der öffentliche Einstieg richtet sich zuerst an Anwenderinnen und Anwender',
    'Alles läuft lokal auf dem eigenen Gerät',
    'Offline-first',
    'Fallakten bündeln Beratung',
    'Demo-Modus',
    'Keine Telemetrie',
    'Fachliche Grenzen und Betriebsvoraussetzungen',
    'docs/BETRIEBSGRENZEN.md',
    'keine rechtliche Beratung',
    'keine Hintergrundsynchronisation',
    'docs/README.md',
    'docs/ARCHITECTURE.md',
    'docs/DEVELOPMENT.md',
    'docs/BUILD.md',
    'docs/QUALITY_GATE.md',
  ]) {
    expect(readme.includes(phrase), `README.md enthält den release-relevanten Produktvertrag nicht: ${phrase}`);
  }
}

function validateDocs() {
  const requiredDocs = [
    'docs/README.md',
    'docs/ARCHITECTURE.md',
    'docs/DEVELOPMENT.md',
    'docs/SECURITY.md',
    'docs/DATENSCHUTZKONZEPT.md',
    'docs/DSFA_SBV_TEMPLATE.md',
    'docs/VERARBEITUNGSVERZEICHNIS_SBV.md',
    'docs/LOESCHKONZEPT_SBV.md',
    'docs/BACKUP_RESTORE.md',
    'docs/ACCESSIBILITY.md',
    'docs/handbuch/README.md',
    'docs/handbuch/01-erste-schritte.md',
    'docs/handbuch/03-datenschutz-und-vertraulichkeit.md',
    'docs/handbuch/07-taetigkeitsjournal.md',
    'docs/handbuch/09-sbv-beteiligung-und-beteiligungsverstoss.md',
    'docs/handbuch/11-backup-restore-und-notfall.md',
    'docs/handbuch/12-barrierearme-bedienung.md',
  ];
  for (const doc of requiredDocs) {
    expect(exists(doc), `Pflichtdokument fehlt: ${doc}`);
  }

  const docsReadme = read('docs/README.md');
  expect(docsReadme.includes('QUALITY_GATE.md'), 'docs/README.md muss das Qualitätsgate aufführen.');
  expect(docsReadme.includes('handbuch/README.md'), 'docs/README.md muss das Benutzerhandbuch aufführen.');
  expect(docsReadme.includes('ACCESSIBILITY.md'), 'docs/README.md muss die Accessibility-Linie aufführen.');
  expect(read('docs/ARCHITECTURE.md').includes("source_context_type = 'case_measure_participation'"), 'ARCHITECTURE.md muss den Beteiligungsverstoß-Kontextvertrag dokumentieren.');
  expect(read('docs/QUALITY_GATE.md').includes('npm run release:local-e2e'), 'QUALITY_GATE.md muss das lokale E2E-Freigabe-Gate nennen.');
  expect(read('docs/ACCESSIBILITY.md').includes('Barrierefreiheit ist deshalb kein nachgelagerter Komfort'), 'ACCESSIBILITY.md muss die barrierefreie Produktlinie dokumentieren.');
  expect(!docsReadme.includes('RELEASE_NOTES_0.9.1.md'), 'docs/README.md darf vor Veröffentlichung keine Release Notes aufführen.');
  expect(!docsReadme.includes('CHANGELOG.md'), 'docs/README.md darf vor Veröffentlichung kein Changelog aufführen.');
  expect(!docsReadme.includes('| `PROCESS_MODULES.md` | fachliche Maßnahmenlogik |'), 'docs/README.md darf PROCESS_MODULES.md nicht doppelt aufführen.');

}

function validatePackageScripts(pkg) {
  const scripts = pkg.scripts ?? {};
  expect(scripts['rc:check']?.includes('check-release-candidate-readiness.cjs'), 'rc:check muss den RC-Readiness-Check ausführen.');
  expect(scripts['release:check'] === 'npm run rc:check && npm run release:check:backup-restore && npm run test:coverage && npm run build:app', 'release:check muss rc:check, den Backup-/Restore-Prozesscheck, test:coverage und den reinen App-Build ohne zweiten Vitest-Lauf bündeln.');
  expect(scripts['release:check:backup-restore'] === 'npm run version:generate && tsx scripts/check-backup-restore-release.ts', 'release:check:backup-restore muss den verschluesselten Backup-/Restore-Prozesscheck ausfuehren.');
expect(scripts['build'] === 'npm run test && npm run build:app', 'build bleibt der lokale Qualitätsbuild mit Tests vor dem reinen App-Build.');
expect(typeof scripts['build:app'] === 'string' && scripts['build:app'].includes('vite build'), 'build:app muss den reinen App-Build ohne Vitest ausführen.');
  expect(scripts['source:cleanup:verbose'] === 'node scripts/cleanup-obsolete-files.cjs --verbose', 'source:cleanup:verbose fehlt.');

  const missing = [];
  for (const [name, command] of Object.entries(scripts)) {
    const refs = [...command.matchAll(/tests\/[A-Za-z0-9_.-]+\.test\.ts/g)].map((match) => match[0]);
    for (const ref of refs) {
      if (!exists(ref)) missing.push(`${name} -> ${ref}`);
    }
  }
  expect(missing.length === 0, `package.json enthält Testskripte mit fehlenden Dateien: ${missing.join(', ')}`);
}

function validateGeneratedVersions(pkg) {
  for (const file of ['src/app/generated/appVersion.ts', 'services/generated/appMetadata.ts']) {
    expect(read(file).includes(`APP_VERSION = "${pkg.version}"`), `${file} ist nicht auf ${pkg.version} generiert.`);
  }
}

function main() {
  const pkg = readJson('package.json');
  validatePackageVersion(pkg);
  validateGeneratedVersions(pkg);
  validateReadme(pkg);
  validateDocs();
  validatePackageScripts(pkg);
  console.log(`RC-Readiness OK: ${pkg.name}@${pkg.version}.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
