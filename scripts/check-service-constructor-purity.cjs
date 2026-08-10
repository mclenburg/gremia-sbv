#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = process.cwd();
const servicesRoot = path.join(root, 'services');
const classificationPath = path.join(root, 'maintenance', 'architecture', 'service-constructor-classification.json');

const FORBIDDEN_METHODS = new Set([
  'exec', 'prepare', 'pragma', 'transaction',
  'ensureSchema', 'ensureDataLayout', 'ensureLayout',
  'migrate', 'initialize', 'bootstrap', 'seedDefaults', 'seedReferenceData',
  'open', 'readFileSync', 'writeFileSync', 'mkdirSync', 'rmSync', 'readdirSync',
  'fetch',
]);
const FORBIDDEN_PROVIDER_NAMES = /(?:^|_)(?:db|database|dataDir|dataDirectory|secret|vault|security).*Provider$/i;
const FORBIDDEN_GETTERS = /^(?:getDb|getDatabase|getActiveDatabase|getActiveDatabaseKey|getDataDir|getDataDirectory|getSecretKey|getVault|resolveDataDirectory)$/;

function normalizeRelative(filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function walkTsFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const result = [];
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(absolute);
      else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) result.push(absolute);
    }
  }
  return result.sort();
}

function readClassification() {
  const parsed = JSON.parse(fs.readFileSync(classificationPath, 'utf8'));
  if (parsed.schemaVersion !== 1 || !parsed.infrastructureExceptions || typeof parsed.infrastructureExceptions !== 'object') {
    throw new Error('Ungültige Service-Konstruktor-Klassifikation.');
  }
  return parsed.infrastructureExceptions;
}

function isExportedClass(node) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function callName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return '';
}

function expressionText(sourceFile, node) {
  return node.getText(sourceFile).replace(/\s+/g, ' ').slice(0, 220);
}

function analyzeConstructor(sourceFile, className, constructorNode) {
  const violations = [];
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const name = callName(node.expression);
      const calleeText = node.expression.getText(sourceFile);
      const isProviderResolution = ts.isIdentifier(node.expression) && (
        FORBIDDEN_PROVIDER_NAMES.test(name) || /Provider$/.test(calleeText)
      );
      if (isProviderResolution) {
        violations.push({ className, kind: 'provider-resolution', expression: expressionText(sourceFile, node), position: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1 });
      } else if (FORBIDDEN_METHODS.has(name) || FORBIDDEN_GETTERS.test(name)) {
        violations.push({ className, kind: 'effectful-call', expression: expressionText(sourceFile, node), position: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1 });
      }
    }
    if (ts.isAwaitExpression(node)) {
      violations.push({ className, kind: 'await-in-constructor', expression: expressionText(sourceFile, node), position: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1 });
    }
    ts.forEachChild(node, visit);
  }
  if (constructorNode.body) ts.forEachChild(constructorNode.body, visit);
  return violations;
}

function analyzeSource(filePath, sourceText, infrastructureExceptions = {}) {
  const relativePath = normalizeRelative(filePath);
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const services = [];
  const violations = [];
  sourceFile.forEachChild((node) => {
    if (!ts.isClassDeclaration(node) || !node.name || !node.name.text.endsWith('Service') || !isExportedClass(node)) return;
    const className = node.name.text;
    const infrastructure = Object.prototype.hasOwnProperty.call(infrastructureExceptions, relativePath);
    services.push({ className, relativePath, infrastructure });
    if (infrastructure) return;
    const ctor = node.members.find(ts.isConstructorDeclaration);
    if (!ctor) return;
    for (const violation of analyzeConstructor(sourceFile, className, ctor)) {
      violations.push({ ...violation, relativePath });
    }
  });
  return { services, violations };
}

function scanProject() {
  const exceptions = readClassification();
  const files = walkTsFiles(servicesRoot);
  const services = [];
  const violations = [];
  for (const file of files) {
    const result = analyzeSource(file, fs.readFileSync(file, 'utf8'), exceptions);
    services.push(...result.services);
    violations.push(...result.violations);
  }
  const discoveredPaths = new Set(services.map((entry) => entry.relativePath));
  const staleExceptions = Object.keys(exceptions).filter((entry) => !discoveredPaths.has(entry));
  return { filesScanned: files.length, services, violations, staleExceptions, exceptions };
}

function formatReport(report) {
  const lines = [
    `Service-Konstruktorprüfung: ${report.services.length} exportierte *Service-Klassen in ${report.filesScanned} Dateien.`,
    `Explizite Infrastruktur-Ausnahmen: ${Object.keys(report.exceptions).length}.`,
  ];
  for (const violation of report.violations) {
    lines.push(`- ${violation.relativePath}:${violation.position} ${violation.className}: ${violation.kind}: ${violation.expression}`);
  }
  for (const stale of report.staleExceptions) lines.push(`- Veraltete Infrastruktur-Ausnahme: ${stale}`);
  return lines.join('\n');
}

function main() {
  const report = scanProject();
  console.log(formatReport(report));
  if (report.violations.length || report.staleExceptions.length) process.exitCode = 1;
}

if (require.main === module) main();
module.exports = { analyzeSource, scanProject, formatReport, FORBIDDEN_METHODS };
