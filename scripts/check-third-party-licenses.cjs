#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const inventoryPath = path.join(root, 'THIRD_PARTY_LICENSES.txt');
const noticesPath = path.join(root, 'THIRD_PARTY_NOTICES.txt');
const licensesRoot = path.join(root, 'LICENSES');
const lockPath = path.join(root, 'package-lock.json');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function packageNameFromLockPath(lockPackagePath) {
  const parts = lockPackagePath.split('/').filter(Boolean);
  const lastNodeModulesIndex = parts.lastIndexOf('node_modules');
  const packageParts = parts.slice(lastNodeModulesIndex + 1);
  if (packageParts[0]?.startsWith('@')) {
    return `${packageParts[0]}/${packageParts[1]}`;
  }
  return packageParts[0] || '';
}


for (const requiredPath of [inventoryPath, noticesPath, licensesRoot]) {
  if (!fs.existsSync(requiredPath)) {
    fail(`${path.relative(root, requiredPath)} fehlt. Führe npm run licenses:generate aus.`);
  }
}

const inventory = readText(inventoryPath);
const notices = readText(noticesPath);
for (const required of ['THIRD-PARTY LICENSE INVENTORY', 'Gremia.SBV', 'License text: LICENSES/']) {
  if (!inventory.includes(required)) {
    fail(`THIRD_PARTY_LICENSES.txt enthält den erwarteten Eintrag nicht: ${required}`);
  }
}
for (const forbidden of ['UNKNOWN', 'bitte upstream package.json prüfen']) {
  if (inventory.includes(forbidden) || notices.includes(forbidden)) {
    fail(`Third-party license documentation enthält verbotenen Platzhalter: ${forbidden}`);
  }
}

const lock = readJson(lockPath);
const directDependencies = {
  ...lock.packages?.['']?.dependencies,
  ...lock.packages?.['']?.devDependencies,
};
for (const name of Object.keys(directDependencies || {})) {
  if (!inventory.includes(`- ${name}@`)) {
    fail(`THIRD_PARTY_LICENSES.txt enthält direkte Abhängigkeit nicht: ${name}`);
  }
}

const packageRecords = new Set();
for (const [lockPackagePath, meta] of Object.entries(lock.packages || {})) {
  if (!lockPackagePath.startsWith('node_modules/')) {
    continue;
  }
  const name = meta.name || packageNameFromLockPath(lockPackagePath);
  packageRecords.add(`${name}@${meta.version}`);
}
for (const packageRecord of packageRecords) {
  if (!inventory.includes(`- ${packageRecord}\n`)) {
    fail(`THIRD_PARTY_LICENSES.txt enthält Lockfile-Paket nicht: ${packageRecord}`);
  }
}

const licenseTextMatches = [...inventory.matchAll(/^  License text: (LICENSES\/[^\n]+)$/gmu)].map((match) => match[1]);
if (licenseTextMatches.length === 0) {
  fail('THIRD_PARTY_LICENSES.txt verweist auf keine Lizenztexte unter LICENSES/.');
}
for (const relativeLicensePath of licenseTextMatches) {
  const absoluteLicensePath = path.join(root, relativeLicensePath);
  if (!fs.existsSync(absoluteLicensePath)) {
    fail(`Referenzierter Lizenztext fehlt: ${relativeLicensePath}`);
  }
  if (readText(absoluteLicensePath).trim().length < 20) {
    fail(`Referenzierter Lizenztext ist auffällig kurz: ${relativeLicensePath}`);
  }
}

if (!notices.includes('THIRD-PARTY NOTICES') || !notices.includes('Copyright notices:')) {
  fail('THIRD_PARTY_NOTICES.txt enthält keine Copyright-/Notice-Auswertung.');
}

console.log('Third-party license inventory, texts and notices OK.');
