#!/usr/bin/env node
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = process.cwd();
const matrixPath = join(root, 'maintenance/test-quality/functional-coverage-matrix.json');
const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));
const violations = [];
const testCache = new Map();

function read(relativePath) {
  if (!testCache.has(relativePath)) testCache.set(relativePath, readFileSync(join(root, relativePath), 'utf8'));
  return testCache.get(relativePath);
}

function symbolExists(source, symbol) {
  const parts = symbol.split('.');
  const name = parts.at(-1);
  if (parts.length === 1) return new RegExp(`\\b(?:function|class|const|let|var)\\s+${name}\\b|\\bexport\\s*\\{[^}]*\\b${name}\\b`, 'm').test(source);
  return new RegExp(`(?:async\\s+)?${name}\\s*\\(`, 'm').test(source);
}

function testNameExists(source, name) {
  return source.includes(`'${name}'`) || source.includes(`\"${name}\"`) || source.includes('`' + name + '`');
}

if (matrix.schemaVersion !== 1) violations.push('Nicht unterstützte schemaVersion der Funktionsmatrix.');
if (!Array.isArray(matrix.functions) || matrix.functions.length === 0) violations.push('Die Funktionsmatrix ist leer.');

const ids = new Set();
for (const item of matrix.functions || []) {
  if (ids.has(item.id)) violations.push(`Doppelte Funktions-ID: ${item.id}`);
  ids.add(item.id);
  const productPath = join(root, item.entryPoint?.file || '');
  if (!existsSync(productPath)) {
    violations.push(`${item.id}: Produktivdatei fehlt: ${item.entryPoint?.file}`);
  } else if (!symbolExists(read(item.entryPoint.file), item.entryPoint.symbol || '')) {
    violations.push(`${item.id}: Einstiegspunkt fehlt: ${item.entryPoint.symbol}`);
  }

  for (const required of ['positive', 'negative']) {
    if (!Array.isArray(item.tests?.[required]) || item.tests[required].length === 0) violations.push(`${item.id}: ${required}-Test fehlt.`);
  }
  if (item.mutatesData && !(['persistence', 'rollback'].some((category) => Array.isArray(item.tests?.[category]) && item.tests[category].length > 0))) {
    violations.push(`${item.id}: Datenänderung ohne Persistenz- oder Rollbacktest.`);
  }
  if (item.criticality === 'security' && !Array.isArray(item.tests?.abuse)) violations.push(`${item.id}: Security-Funktion ohne Missbrauchs-/Manipulationstest.`);

  for (const category of matrix.categories) {
    const references = item.tests?.[category];
    if (references === null) {
      if (!item.rationales?.[category]) violations.push(`${item.id}: Fehlende Kategorie ${category} ist nicht begründet.`);
      continue;
    }
    if (!Array.isArray(references)) {
      violations.push(`${item.id}: Ungültige Kategorie ${category}.`);
      continue;
    }
    for (const reference of references) {
      if (!existsSync(join(root, reference.file))) {
        violations.push(`${item.id}/${category}: Testdatei fehlt: ${reference.file}`);
      } else if (!testNameExists(read(reference.file), reference.name)) {
        violations.push(`${item.id}/${category}: Benannter Test fehlt: ${reference.name}`);
      }
    }
  }
}

if (violations.length) {
  console.error('Funktionsabdeckungsmatrix ist ungültig:');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}
console.log(`Funktionsabdeckungsmatrix gültig: ${matrix.functions.length} kritische Einstiegspunkte.`);
