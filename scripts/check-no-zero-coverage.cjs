#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const MINIMUM_COVERAGE_PERCENT = 60;

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

function countCoverage(values) {
  return { total: values.length, covered: values.filter((value) => Number(value) > 0).length };
}

function lineCoverage(entry) {
  if (entry.l) return countCoverage(Object.values(entry.l));
  const lines = new Map();
  for (const [id, location] of Object.entries(entry.statementMap ?? {})) {
    const line = location.start?.line;
    if (line === undefined) continue;
    lines.set(line, Math.max(lines.get(line) ?? 0, Number(entry.s?.[id] ?? 0)));
  }
  return countCoverage([...lines.values()]);
}

function findCoverageViolations(coverage, minimumPercent = MINIMUM_COVERAGE_PERCENT) {
  const violations = [];
  for (const [file, entry] of Object.entries(coverage ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const statements = countStatementCoverage(entry);
    if (!statements.total) {
      violations.push(`${file}: keine ausführbaren Statements im Coverage-Report`);
      continue;
    }
    const metrics = [
      ['Statements', statements],
      ['Branches', countCoverage(Object.values(entry.b ?? {}).flat())],
      ['Funktionen', countCoverage(Object.values(entry.f ?? {}))],
      ['Zeilen', lineCoverage(entry)],
    ];
    for (const [name, counts] of metrics) {
      if (counts.total && counts.covered * 100 < minimumPercent * counts.total) {
        violations.push(`${file}: ${name} ${(counts.covered * 100 / counts.total).toFixed(1)} % < ${minimumPercent} %`);
      }
    }
  }
  return violations;
}

function defaultCoverageReportPath() {
  return path.resolve(process.cwd(), process.env.GREMIA_SBV_COVERAGE_DIR || 'coverage', 'coverage-final.json');
}

function validateNoZeroCoverage(reportPath = defaultCoverageReportPath()) {
  if (!fs.existsSync(reportPath)) {
    return { reportPath, violations: [`Coverage-JSON fehlt: ${reportPath}`], zeroFiles: [] };
  }
  const coverage = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const zeroFiles = findZeroCoveredFiles(coverage);
  return {
    reportPath,
    zeroFiles,
    violations: findCoverageViolations(coverage),
  };
}

if (require.main === module) {
  const result = validateNoZeroCoverage(process.argv[2]);
  if (result.violations.length) {
    console.error(`Coverage-Gate verletzt (mindestens ${MINIMUM_COVERAGE_PERCENT} % pro Datei und Metrik):`);
    result.violations.forEach((violation) => console.error(`- ${violation}`));
    process.exit(1);
  }
  console.log(`Coverage-Gate OK: mindestens ${MINIMUM_COVERAGE_PERCENT} % pro messbarer Datei und Metrik.`);
}

module.exports = { countStatementCoverage, defaultCoverageReportPath, findZeroCoveredFiles, findCoverageViolations, validateNoZeroCoverage };
