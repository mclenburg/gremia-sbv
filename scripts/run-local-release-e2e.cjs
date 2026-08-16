#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const steps = [
  ['test:e2e:setup', 'isolierte Playwright-/Axe-Werkzeuge installieren'],
  ['test:e2e:ui-flows', 'UI-Nutzerfluesse in einer gemeinsamen Browser-Suite pruefen'],
  ['test:e2e:visual-a11y', 'Visual-/Responsive-/Accessibility-Matrix in workerweit persistenter App pruefen'],
  ['test:e2e:isolated', 'Tests mit zwingend eigener Browserinstanz abschliessend pruefen'],
];

for (const [script, description] of steps) {
  console.log(`\n[release:local-e2e] ${description}: npm run ${script}`);
  const result = spawnSync(npmCommand, ['run', script], {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\n[release:local-e2e] Lokale E2E-/A11y-/Visual-Abnahme erfolgreich.');
