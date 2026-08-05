const { createHash } = require('node:crypto');
const { readdirSync, readFileSync } = require('node:fs');
const { extname, join, relative, resolve } = require('node:path');
const ts = require('typescript');

const DEFAULT_IGNORED_DIRECTORIES = new Set([
  '.git', 'coverage', 'dist', 'dist-electron', 'node_modules', 'playwright-report',
  'release', 'test-results',
]);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

function normalizePath(value) {
  return value.replaceAll('\\', '/');
}

function collectTypeScriptFiles(rootDirectory, options = {}) {
  const root = resolve(rootDirectory);
  const ignoredDirectories = new Set([
    ...DEFAULT_IGNORED_DIRECTORIES,
    ...(options.ignoredDirectories || []),
  ]);

  function collect(directory) {
    return readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))
      .flatMap((entry) => {
        const absolutePath = join(directory, entry.name);
        if (entry.isDirectory()) {
          return ignoredDirectories.has(entry.name) ? [] : collect(absolutePath);
        }
        if (!entry.isFile() || !SOURCE_EXTENSIONS.has(extname(entry.name))) return [];
        if (entry.name.endsWith('.d.ts')) return [];
        return [absolutePath];
      });
  }

  return collect(root);
}

function scriptKindFor(filePath) {
  return filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function nearestNamedAncestor(node, sourceFile) {
  let current = node.parent;
  while (current && current !== sourceFile) {
    if (current.name && typeof current.name.getText === 'function') {
      return current.name.getText(sourceFile);
    }
    current = current.parent;
  }
  return '<module>';
}

function classifyAnyKeyword(node) {
  const parent = node.parent;
  if (!parent) return 'other';
  if (ts.isAsExpression(parent) || ts.isTypeAssertionExpression(parent)) return 'assertion';
  if (ts.isArrayTypeNode(parent)) return 'array_element';
  if (parent.typeArguments?.includes(node)) return 'generic_argument';
  if (ts.isParameter(parent)) return 'parameter';
  if (ts.isPropertySignature(parent) || ts.isPropertyDeclaration(parent)) return 'property';
  if (ts.isVariableDeclaration(parent)) return 'variable';
  if (ts.isTypeAliasDeclaration(parent)) return 'type_alias';
  if (ts.isFunctionDeclaration(parent) || ts.isMethodDeclaration(parent) || ts.isFunctionExpression(parent) || ts.isArrowFunction(parent)) {
    return parent.type === node ? 'return_type' : 'function_type';
  }
  if (ts.isCallSignatureDeclaration(parent) || ts.isMethodSignature(parent) || ts.isFunctionTypeNode(parent) || ts.isConstructorTypeNode(parent)) {
    return parent.type === node ? 'return_type' : 'function_type';
  }
  if (ts.isIndexSignatureDeclaration(parent)) return 'index_signature';
  if (ts.isTupleTypeNode(parent)) return 'tuple_element';
  if (ts.isUnionTypeNode(parent) || ts.isIntersectionTypeNode(parent)) return 'union_or_intersection';
  if (ts.isConditionalTypeNode(parent)) return 'conditional_type';
  if (ts.isMappedTypeNode(parent)) return 'mapped_type';
  return 'other';
}

function compactText(text) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 240);
}

function contextNodeFor(anyNode) {
  let current = anyNode.parent;
  while (current?.parent) {
    if (
      ts.isStatement(current)
      || ts.isTypeAliasDeclaration(current)
      || ts.isInterfaceDeclaration(current)
      || ts.isPropertySignature(current)
      || ts.isParameter(current)
      || ts.isTypeParameterDeclaration(current)
    ) return current;
    current = current.parent;
  }
  return anyNode.parent || anyNode;
}

function auditFile(rootDirectory, absoluteFilePath) {
  const sourceText = readFileSync(absoluteFilePath, 'utf8');
  const relativePath = normalizePath(relative(resolve(rootDirectory), absoluteFilePath));
  const sourceFile = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(relativePath),
  );
  const findings = [];
  const duplicateOrdinals = new Map();

  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const category = classifyAnyKeyword(node);
      const symbol = nearestNamedAncestor(node, sourceFile);
      const context = compactText(contextNodeFor(node).getText(sourceFile));
      const duplicateKey = `${category}\u0000${symbol}\u0000${context}`;
      const ordinal = (duplicateOrdinals.get(duplicateKey) || 0) + 1;
      duplicateOrdinals.set(duplicateKey, ordinal);
      const identityMaterial = `${relativePath}\u0000${duplicateKey}\u0000${ordinal}`;
      const id = createHash('sha256').update(identityMaterial).digest('hex').slice(0, 20);
      findings.push({
        id,
        file: relativePath,
        line: position.line + 1,
        column: position.character + 1,
        category,
        symbol,
        context,
        ordinal,
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function summarizeFindings(findings) {
  const byArea = {};
  const byCategory = {};
  const byFile = {};
  for (const finding of findings) {
    const area = finding.file.includes('/') ? finding.file.split('/')[0] : '<root>';
    byArea[area] = (byArea[area] || 0) + 1;
    byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
    byFile[finding.file] = (byFile[finding.file] || 0) + 1;
  }
  return {
    total: findings.length,
    files: Object.keys(byFile).length,
    byArea: Object.fromEntries(Object.entries(byArea).sort()),
    byCategory: Object.fromEntries(Object.entries(byCategory).sort()),
    byFile: Object.fromEntries(Object.entries(byFile).sort()),
  };
}

function auditExplicitAny(rootDirectory, options = {}) {
  const files = collectTypeScriptFiles(rootDirectory, options);
  const findings = files.flatMap((filePath) => auditFile(rootDirectory, filePath));
  findings.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line || left.column - right.column);
  return { findings, summary: summarizeFindings(findings), scannedFiles: files.length };
}


function validateBaseline(baseline) {
  if (!baseline || baseline.schemaVersion !== 1 || !Array.isArray(baseline.findings)) {
    throw new Error('Explicit-any-Baseline muss schemaVersion 1 und ein findings-Array enthalten.');
  }
  const ids = new Set();
  for (const finding of baseline.findings) {
    if (!finding || typeof finding.id !== 'string' || typeof finding.file !== 'string' || typeof finding.category !== 'string') {
      throw new Error('Explicit-any-Baseline enthält eine unvollständige Fundstelle.');
    }
    if (ids.has(finding.id)) throw new Error(`Explicit-any-Baseline enthält die ID doppelt: ${finding.id}`);
    ids.add(finding.id);
  }
  return baseline;
}

function compareWithBaseline(audit, baseline) {
  validateBaseline(baseline);
  const currentById = new Map(audit.findings.map((finding) => [finding.id, finding]));
  const baselineById = new Map((baseline.findings || []).map((finding) => [finding.id, finding]));
  return {
    additions: audit.findings.filter((finding) => !baselineById.has(finding.id)),
    removals: (baseline.findings || []).filter((finding) => !currentById.has(finding.id)),
  };
}

module.exports = {
  auditExplicitAny,
  classifyAnyKeyword,
  collectTypeScriptFiles,
  compareWithBaseline,
  summarizeFindings,
  validateBaseline,
};
