#!/usr/bin/env node
const { mkdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { e2eToolsDir } = require('./e2e-tools.cjs');

const toolsDir = e2eToolsDir();
mkdirSync(toolsDir, { recursive: true });

console.log(`Installiere E2E-Werkzeuge isoliert nach ${toolsDir}`);
console.log('Die Pakete werden bewusst nicht in package.json, package-lock.json oder node_modules des App-Projekts eingetragen.');

const result = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  [
    'install',
    '--prefix', toolsDir,
    '--no-save',
    '--no-package-lock',
    '@playwright/test@1.59.1',
    '@axe-core/playwright@4.10.2',
  ],
  { stdio: 'inherit', shell: false }
);

process.exit(result.status ?? 1);
