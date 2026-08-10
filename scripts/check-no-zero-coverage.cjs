#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

function countStatementCoverage(entry) {
  const counts = Object.values(entry?.s ?? {}).map(Number);
  return { total: counts.length, covered: counts.filter((value) => value > 0).length };
}

function findZeroCoveredFiles(coverage) {
  const zero = [];
  for (const [file, entry] of Object.entries(coverage ?? {})) {
    const statements = countStatementCoverage(entry);
    if (statements.total > 0 && statements.covered === 0) zero.push(file);
  }
  return zero.sort();
}

function validateNoZeroCoverage(reportPath = path.join(process.cwd(), 'coverage', 'coverage-final.json')) {
  if (!fs.existsSync(reportPath)) {
    return { reportPath, violations: [`Coverage-JSON fehlt: ${reportPath}`], zeroFiles: [] };
  }
  const coverage = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const zeroFiles = findZeroCoveredFiles(coverage);
  return {
    reportPath,
    zeroFiles,
    violations: zeroFiles.map((file) => `Produktivdatei ohne ausgeführtes Statement: ${file}`),
  };
}

if (require.main === module) {
  const result = validateNoZeroCoverage(process.argv[2]);
  if (result.violations.length) {
    console.error('Zero-Coverage-Gate verletzt:');
    result.violations.forEach((violation) => console.error(`- ${violation}`));
    process.exit(1);
  }
  console.log(`Zero-Coverage-Gate OK: keine vollständig ungetestete Datei im Coverage-Scope.`);
}

module.exports = { countStatementCoverage, findZeroCoveredFiles, validateNoZeroCoverage };
