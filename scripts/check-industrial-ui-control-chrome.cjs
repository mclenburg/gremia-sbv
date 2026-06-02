#!/usr/bin/env node
const { readFileSync, readdirSync, statSync } = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const cssFiles = [
  'src/app/ui/forms.css',
  'src/app/ui/components.css',
  'src/app/ui/featureModules.css',
  'src/app/ui/modal.css',
].map((file) => path.join(root, file));
const css = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');

const requiredSelectors = [
  '.industrial-input',
  '.industrial-textarea-input',
  '.industrial-select-input',
  '.industrial-field input',
  '.industrial-field select',
  '.industrial-field textarea',
  '.industrial-form input',
  '.industrial-form select',
  '.industrial-form textarea',
  '.industrial-settings-form input',
  '.industrial-settings-form select',
  '.industrial-settings-form textarea',
  '.industrial-modal input:not([type="checkbox"]):not([type="radio"])',
  '.industrial-modal select',
  '.industrial-modal textarea',
  '.case-detail-inline-form input',
  '.case-detail-inline-form select',
  '.case-detail-inline-form textarea',
];

const missingSelectors = requiredSelectors.filter((selector) => !css.includes(selector));
if (missingSelectors.length > 0) {
  console.error('Industrial-UI-Control-Chrome fehlt fuer Selektoren:');
  for (const selector of missingSelectors) console.error(`- ${selector}`);
  process.exit(1);
}

const allowedContextMarkers = [
  'industrial-modal',
  'industrial-form',
  'industrial-field',
  'industrial-input',
  'industrial-textarea-input',
  'industrial-select-input',
  'industrial-settings-form',
  'case-detail-inline-form',
  'inline-command',
  'industrial-output-area',
  'industrial-checkbox-row',
  'text-command-textarea',
];

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && fullPath.endsWith('.tsx') ? [fullPath] : [];
  });
}

const findings = [];
for (const file of walk(path.join(root, 'src', 'app'))) {
  const text = readFileSync(file, 'utf8');
  const hasAllowedContext = allowedContextMarkers.some((marker) => text.includes(marker));
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!/<(input|textarea|select)\b/.test(line)) return;
    if (line.includes('className=') || hasAllowedContext) return;
    findings.push({ file: path.relative(root, file), line: index + 1, source: line.trim() });
  });
}

if (findings.length > 0) {
  console.error('Moeglich ungestylte native Formular-Controls gefunden:');
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.source}`);
  }
  process.exit(1);
}

console.log(`Industrial-UI-Control-Chrome OK: ${requiredSelectors.length} zentrale Selektoren geprueft.`);
