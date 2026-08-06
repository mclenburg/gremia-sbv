#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const bundlePath = path.join(process.cwd(), 'dist-electron', 'electron', 'preload.js');

function fail(message) {
  console.error(`Preload-Bundleprüfung fehlgeschlagen: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(bundlePath)) {
  fail(`Bundle fehlt: ${path.relative(process.cwd(), bundlePath)}`);
}

const source = fs.readFileSync(bundlePath, 'utf8');
if (!/require\(["']electron["']\)/.test(source)) {
  fail('Electron wird nicht als externe Laufzeitabhängigkeit geladen.');
}
const runtimeRequires = [...source.matchAll(/require\(["']([^"']+)["']\)/g)].map((match) => match[1]);
const unsupportedRuntimeRequires = runtimeRequires.filter((specifier) => specifier !== 'electron');
if (unsupportedRuntimeRequires.length > 0) {
  fail(`Bundle enthält unzulässige Laufzeitabhängigkeiten: ${[...new Set(unsupportedRuntimeRequires)].join(', ')}`);
}
if (/require\(["']\.{1,2}\//.test(source) || /import\(["']\.{1,2}\//.test(source)) {
  fail('Bundle enthält einen lokalen Laufzeitimport; sandboxed Preloads müssen selbständig gebündelt sein.');
}
if (!source.includes('contextBridge') || !source.includes('exposeInMainWorld')) {
  fail('Context-Bridge ist im erzeugten Preload-Bundle nicht enthalten.');
}

console.log(`Preload-Bundle OK: ${path.relative(process.cwd(), bundlePath)} (${Buffer.byteLength(source)} Bytes).`);
