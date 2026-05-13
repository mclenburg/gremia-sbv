#!/usr/bin/env node
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const pairs = [
  ['docs/mermaid/architecture-data-flow.mmd', 'docs/assets/architecture-data-flow.svg'],
  ['docs/mermaid/architecture-components.mmd', 'docs/assets/architecture-components.svg'],
];

function sha256(file) {
  return createHash('sha256').update(readFileSync(file, 'utf8')).digest('hex');
}

function expectedComment(hash) {
  return `<!-- source-sha256: ${hash} -->`;
}

const errors = [];
for (const [source, asset] of pairs) {
  const hash = sha256(source);
  const svg = readFileSync(asset, 'utf8');
  if (!svg.includes(expectedComment(hash))) {
    errors.push(`${asset} ist nicht mit ${source} synchron. Erwartet: ${expectedComment(hash)}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Architekturdiagramme aktuell: ${pairs.map((pair) => path.basename(pair[1])).join(', ')}`);
