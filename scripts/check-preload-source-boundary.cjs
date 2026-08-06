#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = process.cwd();
const entry = path.join(projectRoot, 'electron', 'preload.ts');
const allowedExternal = new Set(['electron']);
const forbiddenMainProcessModules = new Set([
  path.normalize(path.join(projectRoot, 'electron', 'ipc', 'ipcHandler.ts')),
  path.normalize(path.join(projectRoot, 'electron', 'ipc', 'ipcValidation.ts')),
  path.normalize(path.join(projectRoot, 'electron', 'ipc', 'selectedFileCapability.ts')),
]);

function fail(message) {
  console.error(`Preload-Quellgrenzenprüfung fehlgeschlagen: ${message}`);
  process.exit(1);
}

function resolveLocalImport(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = specifier.endsWith('.js')
    ? [base.slice(0, -3) + '.ts', base.slice(0, -3) + '.tsx']
    : [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

if (!fs.existsSync(entry)) fail('electron/preload.ts fehlt.');

const visited = new Set();
const queue = [entry];
const importPattern = /^\s*import\s+(?!type\b)(?:[\s\S]*?\s+from\s+)?["']([^"']+)["'];?/gm;

while (queue.length > 0) {
  const current = path.normalize(queue.pop());
  if (visited.has(current)) continue;
  visited.add(current);

  if (forbiddenMainProcessModules.has(current)) {
    fail(`Main-Process-Modul ist transitiv aus dem Preload erreichbar: ${path.relative(projectRoot, current)}`);
  }

  const source = fs.readFileSync(current, 'utf8');
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (specifier.startsWith('.')) {
      const resolved = resolveLocalImport(current, specifier);
      if (!resolved) fail(`Import kann nicht aufgelöst werden: ${path.relative(projectRoot, current)} -> ${specifier}`);
      queue.push(resolved);
      continue;
    }
    if (!allowedExternal.has(specifier)) {
      fail(`unzulässige Laufzeitabhängigkeit ${specifier} in ${path.relative(projectRoot, current)}`);
    }
  }
}

console.log(`Preload-Quellgrenzen OK: ${visited.size} Laufzeitmodule, extern nur electron.`);
