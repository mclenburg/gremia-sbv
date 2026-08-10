#!/usr/bin/env node
const { existsSync, readFileSync, readdirSync } = require('node:fs');
const { join, relative, sep } = require('node:path');

const TEST_PATTERN = /\.test\.[cm]?[jt]sx?$/;
const LEGACY_SESSION_PATTERN = /(?:090rc\d+[a-z]?|0\d{2,4}[a-z0-9]*|P\d+[a-z]?|Patch\d+|Phase\d+)(?=\.test\.)/i;
const ALLOWED_DOMAINS = new Set(['architecture', 'features', 'platform', 'privacy', 'security', 'ui']);

function normalize(value) { return value.split(sep).join('/'); }

function listTests(root = process.cwd()) {
  const base = join(root, 'tests');
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && TEST_PATTERN.test(entry.name)) files.push(normalize(relative(root, absolute)));
    }
  }
  walk(base);
  return files.sort();
}

function analyzeTestLayout(root = process.cwd()) {
  const files = listTests(root);
  const violations = [];
  const migrationPath = join(root, 'maintenance', 'test-quality', 'test-layout-migration.json');
  for (const file of files) {
    const parts = file.split('/');
    if (parts.length < 3) violations.push(`${file}: Testdateien dürfen nicht direkt unter tests/ liegen.`);
    const domain = parts[1];
    if (!ALLOWED_DOMAINS.has(domain)) violations.push(`${file}: unbekannte Testdomäne ${domain}.`);
    const name = parts.at(-1) ?? '';
    if (LEGACY_SESSION_PATTERN.test(name)) violations.push(`${file}: historischer Patch-/Versionssuffix im Dateinamen.`);
  }
  if (existsSync(migrationPath)) {
    const migration = JSON.parse(readFileSync(migrationPath, 'utf8'));
    const targets = new Set();
    for (const entry of migration.entries ?? []) {
      if (targets.has(entry.to)) violations.push(`${entry.to}: mehrfaches Ziel im Testlayout-Migrationsplan.`);
      targets.add(entry.to);
      if (!existsSync(join(root, entry.to))) violations.push(`${entry.to}: Ziel aus Testlayout-Migrationsplan fehlt.`);
      if (existsSync(join(root, entry.from))) violations.push(`${entry.from}: alter Root-Testpfad ist nach der Migration noch vorhanden.`);
    }
    if (migration.movedTests !== (migration.entries ?? []).length) violations.push('Testlayout-Migrationsplan: movedTests stimmt nicht mit entries überein.');
  }
  return { files, violations };
}

function main() {
  const result = analyzeTestLayout();
  if (result.violations.length) {
    console.error('Testlayout-Vertrag verletzt:');
    result.violations.forEach((violation) => console.error(`- ${violation}`));
    process.exitCode = 1;
    return;
  }
  console.log(`Testlayout OK: ${result.files.length} Tests unter fachlichen Domänen; keine Root-Tests und keine historischen Session-Suffixe.`);
}

if (require.main === module) main();
module.exports = { ALLOWED_DOMAINS, LEGACY_SESSION_PATTERN, analyzeTestLayout, listTests };
