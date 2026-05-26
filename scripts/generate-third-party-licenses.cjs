#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const lockPath = path.join(root, 'package-lock.json');
const outPath = path.join(root, 'THIRD_PARTY_LICENSES.txt');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function packageNameFromLockPath(lockPackagePath) {
  const relative = lockPackagePath.replace(/^node_modules\//, '');
  const parts = relative.split('/');
  if (parts[0]?.startsWith('@')) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

function readInstalledLicense(lockPackagePath) {
  const packageJsonPath = path.join(root, lockPackagePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return undefined;
  }
  const pkg = readJson(packageJsonPath);
  if (typeof pkg.license === 'string') {
    return pkg.license;
  }
  if (Array.isArray(pkg.licenses)) {
    return pkg.licenses.map((entry) => entry.type || entry.license).filter(Boolean).join(' OR ');
  }
  return undefined;
}

if (!fs.existsSync(lockPath)) {
  throw new Error('package-lock.json fehlt; Lizenzinventar kann nicht erzeugt werden.');
}

const lock = readJson(lockPath);
const packages = lock.packages || {};
const records = [];
const seen = new Set();

for (const [lockPackagePath, meta] of Object.entries(packages)) {
  if (!lockPackagePath.startsWith('node_modules/')) {
    continue;
  }
  const name = meta.name || packageNameFromLockPath(lockPackagePath);
  const version = meta.version || 'unbekannt';
  const key = `${name}@${version}`;
  if (seen.has(key)) {
    continue;
  }
  seen.add(key);
  const license = meta.license || readInstalledLicense(lockPackagePath) || 'UNKNOWN - bitte upstream package.json prüfen';
  records.push({ name, version, license });
}

records.sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));

const lines = [];
lines.push('THIRD-PARTY LICENSE INVENTORY');
lines.push('Gremia.SBV');
lines.push('');
lines.push('Generated from package-lock.json and, when available, installed package metadata.');
lines.push('Regenerate after dependency changes with: npm run licenses:generate');
lines.push('');
lines.push('This inventory lists third-party Node/Electron dependencies.');
lines.push('Each dependency remains licensed by its upstream project.');
lines.push('');
for (const record of records) {
  lines.push(`- ${record.name}@${record.version}`);
  lines.push(`  License: ${record.license}`);
}
lines.push('');
fs.writeFileSync(outPath, `${lines.join('\n')}\n`);
console.log(`Wrote ${records.length} third-party license records to ${path.relative(root, outPath)}.`);
