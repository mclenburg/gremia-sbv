#!/usr/bin/env node
const { classifyTestFiles, listTestFiles } = require('./lib/test-suite-groups.cjs');
const { config, assignments } = classifyTestFiles();
const all = listTestFiles();
const flattened = config.precedence.flatMap((group) => assignments[group]);
const unique = new Set(flattened);
const violations = [];
if (flattened.length !== unique.size) violations.push('Mindestens eine Testdatei ist mehreren Gruppen zugeordnet.');
if (unique.size !== all.length) violations.push(`${all.length - unique.size} Testdateien sind keiner Gruppe zugeordnet.`);
for (const group of config.precedence) if (assignments[group].length === 0) violations.push(`Testgruppe ${group} ist leer.`);
if (violations.length) {
  console.error('Testgruppenvertrag verletzt:');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}
for (const group of config.precedence) console.log(`${group}: ${assignments[group].length}`);
console.log(`Gesamt: ${all.length} Testdateien, jede exakt einmal zugeordnet.`);
