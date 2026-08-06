#!/usr/bin/env node
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

function fail(message) {
  console.error(`Build-Plattform-Check fehlgeschlagen: ${message}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts || {};

const expected = {
  'build:linux': 'npm run build:verify && npm run build:compile && npm run build:package:linux',
  'build:win': 'npm run build:verify && npm run build:compile && npm run build:package:windows',
  'build:windows': 'npm run build:verify && npm run build:compile && npm run build:package:windows',
  'build:mac': 'npm run build:verify && npm run build:compile && npm run build:package:mac',
  'build:package:linux': 'node scripts/build-platform.cjs linux',
  'build:package:windows': 'node scripts/build-platform.cjs win',
  'build:package:mac': 'node scripts/build-platform.cjs mac',
  'build:current': 'node scripts/build-current-platform.cjs',
  'native:clean': 'node scripts/clean-native-build.cjs'
};

for (const [name, value] of Object.entries(expected)) {
  if (scripts[name] !== value) fail(`${name} muss "${value}" sein, ist aber "${scripts[name]}".`);
}

for (const name of ['build:linux', 'build:win', 'build:windows', 'build:mac', 'build:package:linux', 'build:package:windows', 'build:package:mac']) {
  if (/\bbash\b|\.sh\b/.test(scripts[name] || '')) {
    fail(`${name} darf nicht von Bash abhängig sein.`);
  }
}

for (const file of [
  'scripts/build-platform.cjs',
  'scripts/build-current-platform.cjs',
  'scripts/clean-native-build.cjs',
  'scripts/build-artifact-state.cjs'
]) {
  if (!existsSync(join(process.cwd(), file))) fail(`${file} fehlt.`);
}

console.log(`Build-Plattform-Check OK: ${pkg.name}@${pkg.version}.`);
console.log('Builds: npm run build:linux, npm run build:win, npm run build:mac, npm run build:current');
