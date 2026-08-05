#!/usr/bin/env node
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { auditExplicitAny, compareWithBaseline, validateBaseline } = require('./lib/explicit-any-audit.cjs');

const args = new Set(process.argv.slice(2));
const rootDirectory = process.cwd();
const baselinePath = resolve(rootDirectory, 'maintenance/type-safety/explicit-any-baseline.json');
const audit = auditExplicitAny(rootDirectory);
let baseline;
try {
  baseline = validateBaseline(JSON.parse(readFileSync(baselinePath, 'utf8')));
} catch (error) {
  console.error(`Explicit-any-Baseline kann nicht gelesen werden: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}
const comparison = compareWithBaseline(audit, baseline);

const report = {
  schemaVersion: 1,
  scannedFiles: audit.scannedFiles,
  summary: audit.summary,
  baseline: {
    total: baseline.findings.length,
    additions: comparison.additions.length,
    removals: comparison.removals.length,
  },
  additions: comparison.additions,
  removals: comparison.removals,
  findings: args.has('--include-findings') ? audit.findings : undefined,
};

if (args.has('--json')) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  console.log('Explizites TypeScript-any – AST-Audit');
  console.log(`Gescannte TypeScript-Dateien: ${audit.scannedFiles}`);
  console.log(`Fundstellen: ${audit.summary.total} in ${audit.summary.files} Dateien`);
  console.log('\nNach Bereich:');
  for (const [area, count] of Object.entries(audit.summary.byArea)) console.log(`  ${area}: ${count}`);
  console.log('\nNach Datei:');
  for (const [file, count] of Object.entries(audit.summary.byFile)) console.log(`  ${file}: ${count}`);
  console.log('\nNach syntaktischer Rolle:');
  for (const [category, count] of Object.entries(audit.summary.byCategory)) console.log(`  ${category}: ${count}`);
  console.log(`\nGegen Baseline: ${comparison.additions.length} neu, ${comparison.removals.length} entfernt`);
  if (comparison.additions.length) {
    console.log('\nNeue Fundstellen:');
    for (const finding of comparison.additions) {
      console.log(`  ${finding.file}:${finding.line}:${finding.column} [${finding.category}] ${finding.context}`);
    }
  }
  if (comparison.removals.length && !args.has('--check')) {
    console.log('\nAus der Baseline verschwundene Fundstellen (Baseline im selben Patch absenken):');
    for (const finding of comparison.removals) console.log(`  ${finding.file} [${finding.category}] ${finding.context}`);
  }
}

if (args.has('--check')) {
  if (comparison.additions.length || comparison.removals.length) {
    console.error(
      `Explicit-any-Ratchet fehlgeschlagen: ${comparison.additions.length} neue und ${comparison.removals.length} `
      + 'nicht aus der Baseline entfernte Fundstellen.',
    );
    process.exit(1);
  }
  console.log('Explicit-any-Ratchet: Baseline exakt eingehalten.');
}
