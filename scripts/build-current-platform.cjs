#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const map = {
  linux: 'linux',
  win32: 'win',
  darwin: 'mac'
};

const target = map[process.platform];
if (!target) {
  console.error(`Keine Paketierung für diese Plattform definiert: ${process.platform}`);
  process.exit(2);
}

const result = spawnSync(process.execPath, ['scripts/build-platform.cjs', target], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
process.exit(result.status ?? 1);
