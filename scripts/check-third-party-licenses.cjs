#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const inventoryPath = path.join(process.cwd(), 'THIRD_PARTY_LICENSES.txt');
const lockPath = path.join(process.cwd(), 'package-lock.json');

if (!fs.existsSync(inventoryPath)) {
  console.error('THIRD_PARTY_LICENSES.txt fehlt. Führe npm run licenses:generate aus.');
  process.exit(1);
}

const inventory = fs.readFileSync(inventoryPath, 'utf8');
for (const required of ['THIRD-PARTY LICENSE INVENTORY', 'Gremia.SBV', 'electron@', 'react@', 'better-sqlite3-multiple-ciphers@']) {
  if (!inventory.includes(required)) {
    console.error(`THIRD_PARTY_LICENSES.txt enthält den erwarteten Eintrag nicht: ${required}`);
    process.exit(1);
  }
}

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const directDependencies = {
  ...lock.packages?.['']?.dependencies,
  ...lock.packages?.['']?.devDependencies,
};
for (const name of Object.keys(directDependencies || {})) {
  if (!inventory.includes(`- ${name}@`)) {
    console.error(`THIRD_PARTY_LICENSES.txt enthält direkte Abhängigkeit nicht: ${name}`);
    process.exit(1);
  }
}

console.log('Third-party license inventory OK.');
