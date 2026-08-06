#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const { classifyTestFiles } = require('./lib/test-suite-groups.cjs');

const group = process.argv[2];
const { config, assignments } = classifyTestFiles();
if (!config.precedence.includes(group)) {
  console.error(`Unbekannte Testgruppe: ${group}. Erlaubt: ${config.precedence.join(', ')}`);
  process.exit(2);
}
const files = assignments[group];
if (files.length === 0) {
  console.error(`Testgruppe ${group} ist leer.`);
  process.exit(1);
}
console.log(`Testgruppe ${group}: ${files.length} Dateien`);
const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(executable, ['vitest', 'run', ...files], { stdio: 'inherit', shell: false });
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
