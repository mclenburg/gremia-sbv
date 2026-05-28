#!/usr/bin/env node
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');

function localBin(name) {
  return process.platform === 'win32'
    ? join(process.cwd(), 'node_modules', '.bin', `${name}.cmd`)
    : join(process.cwd(), 'node_modules', '.bin', name);
}

function appendNodeOption(current, option) {
  const parts = (current || '').split(/\s+/).filter(Boolean);
  return parts.includes(option) ? parts.join(' ') : [...parts, option].join(' ');
}

function isKnownUpstreamPackagingNoise(line) {
  return line.includes('[DEP0190] DeprecationWarning: Passing args to a child process with shell option true')
    || line.includes('Use `node --trace-deprecation ...` to show where the warning was created')
    || line.includes('duplicate dependency references');
}

function pipeFiltered(stream, target) {
  const reader = createInterface({ input: stream });
  reader.on('line', (line) => {
    if (!isKnownUpstreamPackagingNoise(line)) target.write(`${line}\n`);
  });
}

const electronBuilder = localBin('electron-builder');
if (!existsSync(electronBuilder)) {
  console.error('Build-Abbruch: electron-builder ist nicht lokal installiert. Bitte zuerst ausführen: npm install');
  process.exit(4);
}

const env = {
  ...process.env,
  NODE_OPTIONS: appendNodeOption(process.env.NODE_OPTIONS, '--no-deprecation'),
};

const child = spawn(electronBuilder, process.argv.slice(2), {
  cwd: process.cwd(),
  env,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
});

pipeFiltered(child.stdout, process.stdout);
pipeFiltered(child.stderr, process.stderr);

child.on('error', (error) => {
  console.error(`electron-builder konnte nicht gestartet werden: ${error.message}`);
  process.exit(1);
});

child.on('close', (code) => process.exit(code ?? 1));
