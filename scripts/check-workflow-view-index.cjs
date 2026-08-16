#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const projectRoot = process.cwd();
const filePath = path.join(projectRoot, 'src', 'app', 'workflowViews.tsx');

function fail(message) {
  console.error(`workflowViews-Architekturprüfung fehlgeschlagen: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(filePath)) fail('src/app/workflowViews.tsx fehlt.');
const source = fs.readFileSync(filePath, 'utf8');
const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const allowedKinds = new Set([
  ts.SyntaxKind.ExportDeclaration,
  ts.SyntaxKind.ImportDeclaration,
  ts.SyntaxKind.EmptyStatement,
]);

for (const statement of sourceFile.statements) {
  if (!allowedKinds.has(statement.kind)) {
    fail(`nur Import-/Export-Orchestrierung ist zulässig; gefunden: ${ts.SyntaxKind[statement.kind]}`);
  }
  if (ts.isImportDeclaration(statement)) {
    fail('workflowViews.tsx soll keine lokalen Bindings besitzen, sondern ausschließlich re-exportieren.');
  }
}

const exportDeclarations = sourceFile.statements.filter(ts.isExportDeclaration);
if (exportDeclarations.length === 0) fail('mindestens ein Re-Export wird erwartet.');
for (const declaration of exportDeclarations) {
  if (!declaration.moduleSpecifier || !ts.isStringLiteral(declaration.moduleSpecifier)) {
    fail('lokale Exportblöcke ohne Modulquelle sind nicht zulässig.');
  }
}

console.log(`workflowViews-Architektur OK: ${exportDeclarations.length} reine Re-Exports.`);
