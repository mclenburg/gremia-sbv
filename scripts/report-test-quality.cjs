#!/usr/bin/env node
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { summarizeTestQuality } = require('./lib/test-quality-metrics.cjs');

const args = new Set(process.argv.slice(2));
const summary = summarizeTestQuality();

function printText(value) {
  console.log('Gremia.SBV Testqualitätsbericht');
  console.log(`Testdateien gesamt: ${value.totalFiles}`);
  console.log(`Verhaltensdateien: ${value.behaviorFiles}`);
  console.log(`Hybride Dateien: ${value.hybridFiles}`);
  console.log(`Reine Source-Inspection-Dateien: ${value.sourceInspectionFiles}`);
  console.log(`Dateien mit Projektquelltext-Lesezugriff: ${value.filesReadingProjectSource}`);
  console.log(`Dateien mit direktem Produktivcode-Import: ${value.filesImportingProductionCode}`);
  console.log(`Assertions gesamt: ${value.assertions}`);
  console.log(`Source-Text-Assertions: ${value.sourceAssertions}`);
  console.log(`Anteil Source-Text-Assertions: ${(value.sourceAssertionRatio * 100).toFixed(1)} %`);
}

if (args.has('--json')) console.log(JSON.stringify(summary, null, 2));
else printText(summary);

if (args.has('--check')) {
  const baselinePath = join(process.cwd(), 'maintenance/test-quality/test-quality-baseline.json');
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const violations = [];
  if (typeof baseline.maximumSourceAssertionRatio === 'number' && summary.sourceAssertionRatio > baseline.maximumSourceAssertionRatio) {
    violations.push(`Anteil Source-Text-Assertions: ${(summary.sourceAssertionRatio * 100).toFixed(1)} % > ${(baseline.maximumSourceAssertionRatio * 100).toFixed(1)} %`);
  }
  if (summary.hybridFiles > baseline.maximumHybridFiles) {
    violations.push(`Hybride Dateien: ${summary.hybridFiles} > ${baseline.maximumHybridFiles}`);
  }
  if (typeof baseline.minimumTotalFiles === 'number' && summary.totalFiles < baseline.minimumTotalFiles) {
    violations.push(`Testdateien gesamt: ${summary.totalFiles} < ${baseline.minimumTotalFiles}`);
  }
  if (typeof baseline.minimumAssertions === 'number' && summary.assertions < baseline.minimumAssertions) {
    violations.push(`Assertions gesamt: ${summary.assertions} < ${baseline.minimumAssertions}`);
  }
  if (violations.length > 0) {
    console.error('Testqualitäts-Ratchet verletzt:');
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
  }
}
