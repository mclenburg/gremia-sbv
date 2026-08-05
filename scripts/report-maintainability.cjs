#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const BASELINE_SCHEMA_VERSION = 1;
const DEFAULT_ROOTS = ['electron', 'services', 'src'];
const DEFAULT_LIMITS = Object.freeze({
  physicalLines: 500,
  codeLines: 420,
  maxFunctionLines: 120,
  imports: 35,
});
const DEFAULT_BASELINE_PATH = path.join('maintenance', 'architecture', 'maintainability-baseline.json');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
const EXCLUDED_DIRECTORIES = new Set([
  'coverage',
  'dist',
  'dist-electron',
  'generated',
  'node_modules',
  'release',
]);

function normalizeRelative(filePath) {
  return filePath.split(path.sep).join('/');
}

function isSourceFile(filePath) {
  const normalized = normalizeRelative(filePath);
  if (normalized.endsWith('.d.ts')) return false;
  return SOURCE_EXTENSIONS.has(path.extname(normalized));
}

function collectSourceFiles(projectRoot, roots = DEFAULT_ROOTS) {
  const files = [];

  function visit(absolutePath) {
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      if (EXCLUDED_DIRECTORIES.has(path.basename(absolutePath))) return;
      for (const entry of fs.readdirSync(absolutePath).sort()) {
        visit(path.join(absolutePath, entry));
      }
      return;
    }

    if (isSourceFile(absolutePath)) {
      files.push(normalizeRelative(path.relative(projectRoot, absolutePath)));
    }
  }

  for (const root of roots) {
    const absoluteRoot = path.resolve(projectRoot, root);
    if (fs.existsSync(absoluteRoot)) visit(absoluteRoot);
  }

  return files.sort();
}

function scriptKindFor(filePath) {
  const extension = path.extname(filePath);
  if (extension === '.tsx') return ts.ScriptKind.TSX;
  if (extension === '.jsx') return ts.ScriptKind.JSX;
  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function countCodeLines(sourceText, sourceFile) {
  const codeLines = new Set();
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    sourceFile.languageVariant,
    sourceText,
  );

  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (
      token === ts.SyntaxKind.WhitespaceTrivia
      || token === ts.SyntaxKind.NewLineTrivia
      || token === ts.SyntaxKind.SingleLineCommentTrivia
      || token === ts.SyntaxKind.MultiLineCommentTrivia
      || token === ts.SyntaxKind.ShebangTrivia
    ) {
      continue;
    }

    const start = sourceFile.getLineAndCharacterOfPosition(scanner.getTokenPos()).line;
    const end = sourceFile.getLineAndCharacterOfPosition(scanner.getTextPos()).line;
    for (let line = start; line <= end; line += 1) codeLines.add(line);
  }

  return codeLines.size;
}

function isFunctionLike(node) {
  return ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node);
}

function analyzeSource(projectRoot, relativePath) {
  const absolutePath = path.resolve(projectRoot, relativePath);
  const sourceText = fs.readFileSync(absolutePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(relativePath),
  );

  let functionCount = 0;
  let maxFunctionLines = 0;
  let imports = 0;

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) imports += 1;
  }

  function visit(node) {
    if (isFunctionLike(node)) {
      functionCount += 1;
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line;
      maxFunctionLines = Math.max(maxFunctionLines, end - start + 1);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return {
    physicalLines: sourceText.length === 0 ? 0 : sourceText.split(/\r?\n/).length,
    codeLines: countCodeLines(sourceText, sourceFile),
    functionCount,
    maxFunctionLines,
    imports,
  };
}

function exceedsLimits(metrics, limits = DEFAULT_LIMITS) {
  return Object.entries(limits).some(([metric, limit]) => metrics[metric] > limit);
}

function analyzeProject(projectRoot, options = {}) {
  const roots = options.roots ?? DEFAULT_ROOTS;
  const limits = options.limits ?? DEFAULT_LIMITS;
  const files = collectSourceFiles(projectRoot, roots);
  const metricsByFile = {};

  for (const file of files) metricsByFile[file] = analyzeSource(projectRoot, file);

  const debt = Object.fromEntries(
    Object.entries(metricsByFile).filter(([, metrics]) => exceedsLimits(metrics, limits)),
  );

  return {
    filesScanned: files.length,
    limits: { ...limits },
    metricsByFile,
    debt,
  };
}

function createBaseline(projectRoot, options = {}) {
  const analysis = analyzeProject(projectRoot, options);
  return {
    schemaVersion: BASELINE_SCHEMA_VERSION,
    description: 'Obergrenzen fuer bestehende Architektur- und Dateigroessenschulden. Werte duerfen nur sinken.',
    roots: options.roots ?? DEFAULT_ROOTS,
    limits: analysis.limits,
    summary: {
      filesScanned: analysis.filesScanned,
      debtFiles: Object.keys(analysis.debt).length,
    },
    debt: Object.fromEntries(
      Object.entries(analysis.debt).map(([file, metrics]) => [
        file,
        Object.fromEntries(Object.keys(analysis.limits).map((metric) => [metric, metrics[metric]])),
      ]),
    ),
  };
}

function readBaseline(projectRoot, baselinePath = DEFAULT_BASELINE_PATH) {
  const absolutePath = path.resolve(projectRoot, baselinePath);
  const baseline = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  if (baseline.schemaVersion !== BASELINE_SCHEMA_VERSION) {
    throw new Error(`Nicht unterstuetzte Maintainability-Baseline: Schema ${baseline.schemaVersion}.`);
  }
  return baseline;
}

function compareWithBaseline(analysis, baseline) {
  const violations = [];
  const improvements = [];
  const debt = baseline.debt ?? {};
  const limits = baseline.limits ?? DEFAULT_LIMITS;

  for (const [file, metrics] of Object.entries(analysis.metricsByFile)) {
    const allowed = debt[file];
    if (!allowed) {
      for (const [metric, limit] of Object.entries(limits)) {
        if (metrics[metric] > limit) {
          violations.push(`${file}: neue Architekturschuld ${metric}=${metrics[metric]} > ${limit}`);
        }
      }
      continue;
    }

    for (const [metric, previousMaximum] of Object.entries(allowed)) {
      const current = metrics[metric];
      if (current > previousMaximum) {
        violations.push(`${file}: ${metric} auf ${current} gewachsen (Baseline ${previousMaximum})`);
      } else if (current < previousMaximum) {
        improvements.push(`${file}: ${metric} ${previousMaximum} -> ${current}`);
      }
    }

    if (!exceedsLimits(metrics, limits)) {
      violations.push(`${file}: liegt nicht mehr ueber den Grenzwerten; Baseline-Eintrag entfernen`);
    }
  }

  for (const file of Object.keys(debt)) {
    if (!analysis.metricsByFile[file]) {
      violations.push(`${file}: Datei fehlt; veralteten Baseline-Eintrag entfernen`);
    }
  }

  return { violations, improvements };
}

function formatReport(analysis, comparison) {
  const lines = [
    'Gremia.SBV Maintainability-Audit',
    `Produktive Quelldateien: ${analysis.filesScanned}`,
    `Bestehende Schuld-Dateien: ${Object.keys(analysis.debt).length}`,
    `Grenzwerte: ${Object.entries(analysis.limits).map(([key, value]) => `${key}<=${value}`).join(', ')}`,
  ];

  const largest = Object.entries(analysis.metricsByFile)
    .sort(([, left], [, right]) => right.physicalLines - left.physicalLines)
    .slice(0, 10);
  lines.push('', 'Groesste Dateien:');
  for (const [file, metrics] of largest) {
    lines.push(`- ${file}: ${metrics.physicalLines} Zeilen, ${metrics.codeLines} Codezeilen, max. Funktion ${metrics.maxFunctionLines}, ${metrics.imports} Imports`);
  }

  if (comparison) {
    lines.push('', `Regressionen: ${comparison.violations.length}`);
    for (const violation of comparison.violations) lines.push(`- ${violation}`);
    if (comparison.improvements.length > 0) {
      lines.push('', `Verbesserungen gegen Baseline: ${comparison.improvements.length}`);
      for (const improvement of comparison.improvements.slice(0, 20)) lines.push(`- ${improvement}`);
    }
  }

  return lines.join('\n');
}

function parseArgs(argv) {
  const args = new Set(argv);
  return {
    check: args.has('--check'),
    writeBaseline: args.has('--write-baseline'),
    json: args.has('--json'),
  };
}

function runCli(argv = process.argv.slice(2), projectRoot = process.cwd()) {
  const options = parseArgs(argv);
  const baselinePath = DEFAULT_BASELINE_PATH;

  if (options.writeBaseline) {
    const baseline = createBaseline(projectRoot);
    const absolutePath = path.resolve(projectRoot, baselinePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(`Maintainability-Baseline geschrieben: ${baselinePath} (${baseline.summary.debtFiles} Schuld-Dateien).`);
    return 0;
  }

  const baseline = readBaseline(projectRoot, baselinePath);
  const analysis = analyzeProject(projectRoot, { roots: baseline.roots, limits: baseline.limits });
  const comparison = compareWithBaseline(analysis, baseline);

  if (options.json) {
    console.log(JSON.stringify({ analysis, comparison }, null, 2));
  } else {
    console.log(formatReport(analysis, comparison));
  }

  if (options.check && comparison.violations.length > 0) return 1;
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  BASELINE_SCHEMA_VERSION,
  DEFAULT_LIMITS,
  analyzeProject,
  analyzeSource,
  collectSourceFiles,
  compareWithBaseline,
  createBaseline,
  exceedsLimits,
  formatReport,
  runCli,
};
