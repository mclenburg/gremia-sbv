#!/usr/bin/env node
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { collectTestQuality } = require('./lib/test-quality-metrics.cjs');

const manifest = JSON.parse(readFileSync(join(process.cwd(), 'maintenance/test-quality/source-assertion-classification.json'), 'utf8'));
const actual = collectTestQuality().filter((entry) => entry.sourceAssertionCount > 0);
const listed = new Map(manifest.entries.map((entry) => [entry.file, entry]));
const errors = [];
for (const entry of actual) {
  const classification = listed.get(entry.file);
  if (!classification) errors.push(`${entry.file}: nicht klassifiziert`);
  else if (classification.sourceAssertions !== entry.sourceAssertionCount) errors.push(`${entry.file}: Assertionzahl veraltet (${classification.sourceAssertions} != ${entry.sourceAssertionCount})`);
  else if (!['A', 'B', 'C'].includes(classification.category)) errors.push(`${entry.file}: unbekannte Kategorie`);
  else if (!classification.rationale?.trim()) errors.push(`${entry.file}: Begründung fehlt`);
}
for (const entry of manifest.entries) {
  if (!actual.some((actualEntry) => actualEntry.file === entry.file)) errors.push(`${entry.file}: verwaiste Klassifikation`);
  if (entry.category === 'C') errors.push(`${entry.file}: Kategorie C darf erst nach Ersatz durch Verhaltenstest aus dem Manifest entfernt werden`);
}
if (errors.length) {
  console.error('Source-Assertion-Klassifikation fehlgeschlagen:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const counts = manifest.entries.reduce((acc, entry) => ({...acc, [entry.category]:(acc[entry.category]??0)+1}), {});
  console.log(`Source-Assertion-Klassifikation OK: ${actual.length} Dateien, A=${counts.A??0}, B=${counts.B??0}, C=0.`);
}
