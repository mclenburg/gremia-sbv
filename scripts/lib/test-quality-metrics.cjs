const { readdirSync, readFileSync } = require('node:fs');
const { join, relative } = require('node:path');
const ts = require('typescript');

const TEST_FILE_PATTERN = /\.(?:test|spec)\.tsx?$/;
const PRODUCT_IMPORT_PATTERN = /(?:from\s*['"]|import\s*\(\s*['"]|require\s*\(\s*['"])(?:\.\.\/)+(?:services|src|electron|scripts|database)\//;
const SOURCE_READER_NAMES = new Set(['readFileSync', 'readNormalizedSourceText']);
const SOURCE_MATCHER_NAMES = new Set(['toContain', 'toMatch']);

function collectTestFiles(root = process.cwd()) {
  const roots = ['tests', 'e2e'];
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) files.push(relative(root, absolute).replaceAll('\\', '/'));
    }
  }
  for (const name of roots) {
    const absolute = join(root, name);
    try { walk(absolute); } catch (error) {
      if (!error || error.code !== 'ENOENT') throw error;
    }
  }
  return files.sort();
}

function scriptKindFor(file) {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  return ts.ScriptKind.TS;
}

function propertyName(node) {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isStringLiteralLike(node)) return node.text;
  return null;
}

function callName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (ts.isElementAccessExpression(expression) && expression.argumentExpression) {
    return propertyName(expression.argumentExpression);
  }
  return null;
}

function isSourceReaderCall(node) {
  return ts.isCallExpression(node) && SOURCE_READER_NAMES.has(callName(node.expression));
}

function collectIdentifiers(node, target) {
  function visit(current) {
    if (ts.isIdentifier(current)) target.add(current.text);
    ts.forEachChild(current, visit);
  }
  visit(node);
}

function expressionUsesTaintedValue(node, tainted) {
  if (isSourceReaderCall(node)) return true;
  let found = false;
  function visit(current) {
    if (found) return;
    if (ts.isIdentifier(current) && tainted.has(current.text)) {
      found = true;
      return;
    }
    if (isSourceReaderCall(current)) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return found;
}

function collectTaintedBindings(sourceFile) {
  const tainted = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    function markBinding(name) {
      if (ts.isIdentifier(name) && !tainted.has(name.text)) {
        tainted.add(name.text);
        changed = true;
      }
    }
    function visit(node) {
      if (ts.isVariableDeclaration(node) && node.initializer && expressionUsesTaintedValue(node.initializer, tainted)) {
        markBinding(node.name);
      } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && expressionUsesTaintedValue(node.right, tainted)) {
        markBinding(node.left);
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }
  return tainted;
}

function unwrapMatcherExpression(expression) {
  let current = expression;
  let negated = false;
  if (ts.isPropertyAccessExpression(current) && current.name.text === 'not') {
    negated = true;
    current = current.expression;
  }
  return { current, negated };
}

function findExpectCall(matcherCall) {
  if (!ts.isCallExpression(matcherCall)) return null;
  const matcherAccess = matcherCall.expression;
  if (!ts.isPropertyAccessExpression(matcherAccess)) return null;
  if (!SOURCE_MATCHER_NAMES.has(matcherAccess.name.text)) return null;
  const { current } = unwrapMatcherExpression(matcherAccess.expression);
  if (!ts.isCallExpression(current) || !ts.isIdentifier(current.expression) || current.expression.text !== 'expect') return null;
  return current;
}

function analyzeAssertions(sourceFile, tainted) {
  let assertionCount = 0;
  let sourceAssertionCount = 0;
  function visit(node) {
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 'expect') assertionCount += 1;
      const expectCall = findExpectCall(node);
      const actual = expectCall?.arguments[0];
      if (actual && expressionUsesTaintedValue(actual, tainted)) sourceAssertionCount += 1;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return { assertionCount, sourceAssertionCount };
}

function classifyFile(file, source) {
  const isE2e = file.startsWith('e2e/');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKindFor(file));
  const taintedBindings = collectTaintedBindings(sourceFile);
  const { assertionCount, sourceAssertionCount } = analyzeAssertions(sourceFile, taintedBindings);
  const readsProjectSource = taintedBindings.size > 0 || source.includes('readFileSync(') || source.includes('readNormalizedSourceText(');
  const importsProductionCode = PRODUCT_IMPORT_PATTERN.test(source);
  let category = 'behavior';
  if (!isE2e && sourceAssertionCount > 0) category = importsProductionCode ? 'hybrid' : 'source_inspection';
  return {
    file,
    category,
    readsProjectSource,
    importsProductionCode,
    assertionCount,
    sourceAssertionCount,
  };
}

function collectTestQuality(root = process.cwd()) {
  return collectTestFiles(root).map((file) => classifyFile(file, readFileSync(join(root, file), 'utf8')));
}

function summarizeTestQuality(files = collectTestQuality()) {
  const byCategory = { behavior: [], hybrid: [], source_inspection: [] };
  let assertions = 0;
  let sourceAssertions = 0;
  let filesReadingProjectSource = 0;
  let filesImportingProductionCode = 0;
  for (const entry of files) {
    byCategory[entry.category].push(entry.file);
    assertions += entry.assertionCount;
    sourceAssertions += entry.sourceAssertionCount;
    if (entry.readsProjectSource) filesReadingProjectSource += 1;
    if (entry.importsProductionCode) filesImportingProductionCode += 1;
  }
  for (const category of Object.keys(byCategory)) byCategory[category].sort();
  return {
    schemaVersion: 2,
    definition: 'AST-basierte Assertion-Klassifikation: Stringtest nur bei Matcher auf aus Produktivquelltext gelesenen Werten',
    totalFiles: files.length,
    behaviorFiles: byCategory.behavior.length,
    hybridFiles: byCategory.hybrid.length,
    sourceInspectionFiles: byCategory.source_inspection.length,
    filesReadingProjectSource,
    filesImportingProductionCode,
    assertions,
    sourceAssertions,
    sourceAssertionRatio: assertions === 0 ? 0 : sourceAssertions / assertions,
    files: byCategory,
  };
}

module.exports = { collectTestFiles, classifyFile, collectTestQuality, summarizeTestQuality };
