#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = process.cwd();
const statePath = path.join(root, 'maintenance', 'licenses', 'generation-state.json');
const lockPath = path.join(root, 'package-lock.json');
const inventoryPath = path.join(root, 'THIRD_PARTY_LICENSES.txt');
const noticesPath = path.join(root, 'THIRD_PARTY_NOTICES.txt');
const licensesRoot = path.join(root, 'LICENSES');
const generatorPath = path.join(root, 'scripts', 'generate-third-party-licenses.cjs');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizedText(buffer) {
  return buffer.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function fileHashes(filePath) {
  const buffer = fs.readFileSync(filePath);
  return new Set([sha256(buffer), sha256(Buffer.from(normalizedText(buffer), 'utf8'))]);
}

function matchesHash(filePath, expected) {
  return Boolean(expected && fs.existsSync(filePath) && fileHashes(filePath).has(expected));
}

function listLicenseFiles(directory = licensesRoot) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((name) => fs.statSync(path.join(directory, name)).isFile())
    .sort();
}

function readState(filePath = statePath) {
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}

function cacheStatus(projectRoot = root) {
  const projectStatePath = path.join(projectRoot, 'maintenance', 'licenses', 'generation-state.json');
  const projectLockPath = path.join(projectRoot, 'package-lock.json');
  const projectInventoryPath = path.join(projectRoot, 'THIRD_PARTY_LICENSES.txt');
  const projectNoticesPath = path.join(projectRoot, 'THIRD_PARTY_NOTICES.txt');
  const projectLicensesRoot = path.join(projectRoot, 'LICENSES');
  const state = readState(projectStatePath);
  if (!state || state.schemaVersion !== 3) return { current: false, reason: 'generation state missing or unsupported' };
  if (!matchesHash(projectLockPath, state.lockSha256)) return { current: false, reason: 'package-lock fingerprint changed' };
  if (!matchesHash(projectInventoryPath, state.inventorySha256)) return { current: false, reason: 'license inventory fingerprint changed' };
  if (!matchesHash(projectNoticesPath, state.noticesSha256)) return { current: false, reason: 'notices fingerprint changed' };
  const expected = Array.isArray(state.licenseFiles) ? state.licenseFiles : [];
  const actualNames = listLicenseFiles(projectLicensesRoot);
  const expectedNames = expected.map((entry) => entry.name).sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) return { current: false, reason: 'shared license file set changed' };
  for (const entry of expected) {
    if (!matchesHash(path.join(projectLicensesRoot, entry.name), entry.sha256)) {
      return { current: false, reason: `license fingerprint changed: ${entry.name}` };
    }
  }
  return { current: true, state };
}

function runGenerator(spawn = spawnSync) {
  const status = cacheStatus();
  if (status.current) {
    console.log(`Third-party license artifacts unchanged (${status.state.packageCount} records); generation skipped.`);
    return 0;
  }
  console.log(`Third-party license cache refresh required: ${status.reason}.`);
  const result = spawn(process.execPath, [generatorPath], { cwd: root, env: process.env, stdio: 'inherit', shell: false });
  if (result.error) {
    console.error(`Lizenzgenerator konnte nicht gestartet werden: ${result.error.message}`);
    return 1;
  }
  return typeof result.status === 'number' ? result.status : 1;
}

if (require.main === module) process.exitCode = runGenerator();
module.exports = { cacheStatus, fileHashes, matchesHash, normalizedText, runGenerator };
