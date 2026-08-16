#!/usr/bin/env node
const { readdirSync, readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = process.cwd();
const moduleRoots = [
  {
    label: 'SBV-Dokumentation',
    directory: path.join(root, 'src', 'app', 'features', 'sbv-control', 'components'),
    forbiddenNativeTags: new Set(['input', 'select', 'textarea', 'label']),
  },
  {
    label: 'SBV-Wahlen',
    directory: path.join(root, 'src', 'app', 'features', 'elections'),
    forbiddenNativeTags: new Set(['input', 'select', 'textarea', 'label', 'button']),
  },
];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && fullPath.endsWith('.tsx') ? [fullPath] : [];
  });
}

function jsxTagName(node) {
  if (ts.isIdentifier(node.tagName)) return node.tagName.text;
  return node.tagName.getText();
}

const findings = [];
const counts = [];

for (const moduleRoot of moduleRoots) {
  const files = walk(moduleRoot.directory);
  counts.push(`${moduleRoot.label}: ${files.length}`);

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = jsxTagName(node);
        if (moduleRoot.forbiddenNativeTags.has(tag)) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          findings.push({
            module: moduleRoot.label,
            file: path.relative(root, file),
            line: line + 1,
            column: character + 1,
            tag,
          });
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }
}

if (findings.length > 0) {
  console.error('Industrial-Formulararchitektur verletzt:');
  console.error('Native Formularcontrols und im Wahlmodul auch rohe Buttons sind in den gehärteten Modulen nicht zulässig; nutze zentrale Industrial-Komponenten.');
  for (const finding of findings) {
    console.error(`- ${finding.module}: ${finding.file}:${finding.line}:${finding.column} <${finding.tag}>`);
  }
  process.exit(1);
}

console.log(`Industrial-UI-Control-Chrome OK: ${counts.join(' · ')}; AST-basiert ohne native Formular-Sonderwege.`);
