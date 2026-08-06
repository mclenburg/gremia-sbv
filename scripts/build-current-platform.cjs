#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const scripts = {
  linux: 'build:linux',
  win32: 'build:windows',
  darwin: 'build:mac',
};

const script = scripts[process.platform];
if (!script) {
  console.error(`Keine Paketierung für diese Plattform definiert: ${process.platform}`);
  process.exit(2);
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npmCommand, ['run', script], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
