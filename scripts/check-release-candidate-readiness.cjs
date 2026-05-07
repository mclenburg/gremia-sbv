#!/usr/bin/env node
/*
 * Gremia.SBV release-candidate readiness check.
 *
 * Dependency-free static checks for the final stabilization phase before
 * 0.9.0-rc.1. This does not replace npm run test/build; it catches broken
 * release wiring, stale documentation references and obsolete test scripts.
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

function validateReadme(pkg) {
  const readme = read('README.md');
  expect(readme.includes(`Stand: **${pkg.version}**`), 'README.md muss den aktuellen Paketstand ausweisen.');
  for (const phrase of [
    'offline-first',
    'Fallakte führt',
    'npm run test',
    'npm run build:linux',
    'docs/RELEASE_CHECKLIST.md',
    'keine Rechtsberatung',
  ]) {
    expect(readme.includes(phrase), `README.md enthält den RC-relevanten Hinweis nicht: ${phrase}`);
  }
}

function validateDocs() {
  const requiredDocs = [
    'docs/README.md',
    'docs/ARCHITECTURE.md',
    'docs/DEVELOPMENT.md',
    'docs/RELEASE_CHECKLIST.md',
    'docs/CHANGELOG.md',
    'docs/SECURITY.md',
    'docs/DATENSCHUTZKONZEPT.md',
    'docs/DSFA_SBV_TEMPLATE.md',
    'docs/VERARBEITUNGSVERZEICHNIS_SBV.md',
    'docs/LOESCHKONZEPT_SBV.md',
    'docs/BACKUP_RESTORE.md',
  ];
  for (const doc of requiredDocs) {
    expect(exists(doc), `Pflichtdokument fehlt: ${doc}`);
  }

  const docsReadme = read('docs/README.md');
  expect(docsReadme.includes('RELEASE_CHECKLIST.md'), 'docs/README.md muss die Release-Checkliste aufführen.');
  expect(!docsReadme.includes('| `PROCESS_MODULES.md` | fachliche Maßnahmenlogik |'), 'docs/README.md darf PROCESS_MODULES.md nicht doppelt aufführen.');

  const releaseChecklist = read('docs/RELEASE_CHECKLIST.md');
  for (const phrase of ['npm run rc:check', 'npm run test', 'npm run build', 'npm run build:linux']) {
    expect(releaseChecklist.includes(phrase), `RELEASE_CHECKLIST.md enthält ${phrase} nicht.`);
  }
}

function validatePackageScripts(pkg) {
  const scripts = pkg.scripts ?? {};
  expect(scripts['rc:check']?.includes('check-release-candidate-readiness.cjs'), 'rc:check muss den RC-Readiness-Check ausführen.');
  expect(scripts['release:check'] === 'npm run rc:check && npm run test:coverage && npm run build', 'release:check muss rc:check, Service-Coverage und build bündeln.');
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


function validateReleaseWorkflow(pkg) {
  const workflowPath = '.github/workflows/build-release.yml';
  expect(exists(workflowPath), 'GitHub-Release-Workflow fehlt: .github/workflows/build-release.yml');
  const workflow = read(workflowPath);
  for (const phrase of [
    'tags:',
    'v*',
    'ubuntu-latest',
    'windows-latest',
    'macos-latest',
    'npm ci',
    'GITHUB_REF_NAME#v',
    'npm run rc:check && npm run test:coverage',
    'npm run ${{ matrix.build_script }}',
    'CSC_IDENTITY_AUTO_DISCOVERY: "false"',
    'softprops/action-gh-release@v2',
    'draft: true',
  ]) {
    expect(workflow.includes(phrase), `GitHub-Release-Workflow enthält den erwarteten Vertrag nicht: ${phrase}`);
  }
}

function validateCoverageConfig() {
  const config = read('vitest.config.ts');
  for (const phrase of [
    "provider: 'v8'",
    'const rcCriticalServiceCoverage',
    "'services/securityService.ts'",
    "'services/backupService.ts'",
    "'services/terminationWorkflowPolicy.ts'",
    'branches: 70',
    'functions: 70',
    'lines: 70',
    'statements: 70',
  ]) {
    expect(config.includes(phrase), `Vitest-Coverage-Konfiguration enthält ${phrase} nicht.`);
  }
}

function validatePublicDocVersions(pkg) {
  const versionDocs = ['README.md', 'docs/BUILD.md', 'docs/E2E_TESTS.md', 'docs/KNOWN_ISSUES.md', 'docs/RELEASE_CHECKLIST.md', 'docs/ROADMAP.md'];
  for (const doc of versionDocs) {
    const source = read(doc);
    expect(source.includes(pkg.version), `${doc} muss den aktuellen Paketstand ${pkg.version} ausweisen oder bewusst aktualisiert werden.`);
  }
  const roadmap = read('docs/ROADMAP.md');
  expect(roadmap.includes('/bem`, `/praev`, `/bet`, `/kuend`, `/gleich`, `/anp` und `/fr'), 'ROADMAP.md muss die vollständige RC-Linkabdeckung dokumentieren.');
  expect(!roadmap.includes('erst nach stabiler MVP-Erfahrung'), 'ROADMAP.md darf die umgesetzte Linkabdeckung nicht mehr als Post-RC-Thema führen.');
}

function main() {
  const pkg = readJson('package.json');
  validateGeneratedVersions(pkg);
  validateReadme(pkg);
  validateDocs();
  validatePackageScripts(pkg);
  validateReleaseWorkflow(pkg);
  validateCoverageConfig();
  validatePublicDocVersions(pkg);
  console.log(`RC-Readiness OK: ${pkg.name}@${pkg.version}.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
