#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const http = require('node:http');
const zlib = require('node:zlib');

const root = process.cwd();
const lockPath = path.join(root, 'package-lock.json');
const inventoryPath = path.join(root, 'THIRD_PARTY_LICENSES.txt');
const noticesPath = path.join(root, 'THIRD_PARTY_NOTICES.txt');
const licensesRoot = path.join(root, 'LICENSES');
const registryBaseUrl = (process.env.NPM_REGISTRY_URL || 'https://registry.npmjs.org').replace(/\/+$/, '');
const userAgent = 'gremia-sbv-license-generator/1.0';

const preferredDisjunctiveLicenses = [
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  '0BSD',
  'BlueOak-1.0.0',
  'MPL-2.0',
  'Zlib',
  'Python-2.0',
  'CC0-1.0',
  'CC-BY-4.0',
  'WTFPL',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeTextIfChanged(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === content) {
    return false;
  }
  fs.writeFileSync(filePath, content);
  return true;
}

function writeTextIfMissing(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) {
    return false;
  }
  fs.writeFileSync(filePath, content);
  return true;
}

function removeDirectoryContents(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
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

function registryPackageName(name) {
  // npm expects scoped packages as one URL path segment, e.g. @babel/core -> %40babel%2Fcore.
  // Encoding each path segment separately would leave the slash unescaped and produce
  // https://registry.npmjs.org/%40babel/core/<version>, which is a 404.
  return encodeURIComponent(name);
}

function sanitizePackageName(name, version) {
  return `${name.replace(/^@/, '').replace(/[\\/:*?"<>|@]/g, '_')}@${version}`;
}

function sanitizeLicenseFileName(licenseExpression) {
  return String(licenseExpression || 'UNKNOWN')
    .replace(/^\((.*)\)$/u, '$1')
    .replace(/\s+/gu, '_')
    .replace(/[^A-Za-z0-9._+-]+/gu, '_')
    .replace(/^_+|_+$/gu, '') || 'UNKNOWN';
}

function canonicalizeLicenseText(licenseText) {
  const lines = String(licenseText || '')
    .replace(/\r\n/gu, '\n')
    .split('\n')
    .filter((line) => !/copyright|©|\(c\)/iu.test(line.trim()));
  while (lines.length > 0 && !lines[0].trim()) lines.shift();
  while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();
  return lines.join('\n').trim();
}

function normalizeLicense(license) {
  if (typeof license === 'string') {
    return license.trim();
  }
  if (license && typeof license.type === 'string') {
    return license.type.trim();
  }
  if (Array.isArray(license)) {
    return license.map(normalizeLicense).filter(Boolean).join(' OR ');
  }
  return '';
}

function normalizeLicensesField(pkg) {
  const license = normalizeLicense(pkg?.license);
  if (license) {
    return license;
  }
  if (Array.isArray(pkg?.licenses)) {
    return pkg.licenses.map(normalizeLicense).filter(Boolean).join(' OR ');
  }
  return '';
}

function chooseLicenseExpression(expression) {
  const normalized = String(expression || '').replace(/^\((.*)\)$/u, '$1').trim();
  if (!/\sOR\s/u.test(normalized)) {
    return undefined;
  }
  const alternatives = normalized
    .replace(/[()]/gu, '')
    .split(/\s+OR\s+/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return preferredDisjunctiveLicenses.find((license) => alternatives.includes(license));
}

function requestBuffer(url) {
  const client = url.startsWith('http://') ? http : https;
  return new Promise((resolve, reject) => {
    const req = client.get(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json,*/*' } }, (res) => {
      const statusCode = res.statusCode || 0;
      const location = res.headers.location;
      if (statusCode >= 300 && statusCode < 400 && location) {
        res.resume();
        const redirected = new URL(location, url).toString();
        requestBuffer(redirected).then(resolve, reject);
        return;
      }
      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        reject(new Error(`HTTP ${statusCode} für ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error(`Timeout beim Laden von ${url}`));
    });
  });
}

async function requestJson(url) {
  const buffer = await requestBuffer(url);
  return JSON.parse(buffer.toString('utf8'));
}

async function requestRegistryVersionMetadata(name, version) {
  const encodedPackageName = registryPackageName(name);
  const versionUrl = `${registryBaseUrl}/${encodedPackageName}/${encodeURIComponent(version)}`;
  try {
    return await requestJson(versionUrl);
  } catch (versionError) {
    const packageUrl = `${registryBaseUrl}/${encodedPackageName}`;
    let packageMetadata;
    try {
      packageMetadata = await requestJson(packageUrl);
    } catch (packageError) {
      throw new Error(`${versionError.message}; zusätzlich konnten Paket-Metadaten nicht geladen werden: ${packageError.message}`);
    }
    const versionMetadata = packageMetadata?.versions?.[version];
    if (!versionMetadata) {
      throw new Error(`${versionError.message}; Paket-Metadaten enthalten ${name}@${version} nicht`);
    }
    return versionMetadata;
  }
}

function parseTarEntries(buffer) {
  const entries = [];
  let offset = 0;
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      break;
    }
    const rawName = header.subarray(0, 100).toString('utf8').replace(/\0.*$/u, '');
    const rawPrefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/u, '');
    const name = rawPrefix ? `${rawPrefix}/${rawName}` : rawName;
    const sizeText = header.subarray(124, 136).toString('utf8').replace(/\0.*$/u, '').trim();
    const size = Number.parseInt(sizeText || '0', 8);
    const type = header.subarray(156, 157).toString('utf8');
    offset += 512;
    const content = buffer.subarray(offset, offset + size);
    if (type === '0' || type === '') {
      entries.push({ name, content });
    }
    offset += Math.ceil(size / 512) * 512;
  }
  return entries;
}

async function readTarballEntries(tarballUrl) {
  const compressed = await requestBuffer(tarballUrl);
  const uncompressed = zlib.gunzipSync(compressed);
  return parseTarEntries(uncompressed);
}

function entryBaseName(entryName) {
  return path.posix.basename(entryName).toLowerCase();
}

function findFirstMatchingEntry(entries, match) {
  return entries.find((entry) => match(entryBaseName(entry.name), entry.name));
}

function textFromEntry(entry) {
  return entry ? entry.content.toString('utf8').replace(/\r\n/gu, '\n').trim() : '';
}

function extractCopyrightHints(...texts) {
  const hints = [];
  const seen = new Set();
  for (const text of texts) {
    for (const line of String(text || '').split('\n')) {
      const normalized = line.trim().replace(/\s+/gu, ' ');
      if (!normalized || normalized.length > 240) {
        continue;
      }
      if (/copyright|©|\(c\)/iu.test(normalized) && !seen.has(normalized)) {
        seen.add(normalized);
        hints.push(normalized);
      }
      if (hints.length >= 10) {
        return hints;
      }
    }
  }
  return hints;
}

function installedPackageFallback(lockPackagePath) {
  const packageJsonPath = path.join(root, lockPackagePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return {};
  }
  const pkg = readJson(packageJsonPath);
  const packageDirectory = path.dirname(packageJsonPath);
  const licenseFile = fs.readdirSync(packageDirectory).find((entry) => /^licen[cs]e(?:\.|$)|^copying(?:\.|$)/iu.test(entry));
  const noticeFile = fs.readdirSync(packageDirectory).find((entry) => /^notice(?:\.|$)|^copyright(?:\.|$)/iu.test(entry));
  return {
    pkg,
    licenseText: licenseFile ? fs.readFileSync(path.join(packageDirectory, licenseFile), 'utf8') : '',
    noticeText: noticeFile ? fs.readFileSync(path.join(packageDirectory, noticeFile), 'utf8') : '',
  };
}

async function resolvePackageRecord(lockPackagePath, meta) {
  const name = meta.name || packageNameFromLockPath(lockPackagePath);
  const version = meta.version || '';
  if (!version) {
    throw new Error(`Version fehlt für ${lockPackagePath}.`);
  }

  let registryMetadata;
  let tarballEntries = [];
  try {
    registryMetadata = await requestRegistryVersionMetadata(name, version);
    if (registryMetadata.dist?.tarball) {
      tarballEntries = await readTarballEntries(registryMetadata.dist.tarball);
    }
  } catch (error) {
    throw new Error(`Lizenzdaten konnten nicht online für ${name}@${version} geladen werden: ${error.message}`);
  }

  const packageEntry = findFirstMatchingEntry(tarballEntries, (baseName) => baseName === 'package.json');
  const tarPackageJson = packageEntry ? JSON.parse(textFromEntry(packageEntry)) : {};
  const fallback = installedPackageFallback(lockPackagePath);
  const packageJson = { ...fallback.pkg, ...tarPackageJson, ...registryMetadata };
  const licenseExpression = normalizeLicensesField(packageJson) || normalizeLicensesField(tarPackageJson) || normalizeLicensesField(fallback.pkg);

  if (!licenseExpression) {
    throw new Error(`Keine Lizenzangabe für ${name}@${version} gefunden.`);
  }

  const licenseEntry = findFirstMatchingEntry(tarballEntries, (baseName) => /^licen[cs]e(?:\.|$)|^copying(?:\.|$)/iu.test(baseName));
  const noticeEntry = findFirstMatchingEntry(tarballEntries, (baseName) => /^notice(?:\.|$)|^copyright(?:\.|$)/iu.test(baseName));
  const readmeEntry = findFirstMatchingEntry(tarballEntries, (baseName) => /^readme(?:\.|$)/iu.test(baseName));
  const licenseText = textFromEntry(licenseEntry) || fallback.licenseText;
  const noticeText = textFromEntry(noticeEntry) || fallback.noticeText;
  const readmeText = textFromEntry(readmeEntry);
  const selectedLicense = chooseLicenseExpression(licenseExpression);
  const copyrightHints = extractCopyrightHints(licenseText, noticeText, readmeText, packageJson.author?.name || packageJson.author || '');

  return {
    name,
    version,
    licenseExpression,
    selectedLicense,
    licenseText,
    noticeText,
    copyrightHints,
    repository: typeof packageJson.repository === 'string' ? packageJson.repository : packageJson.repository?.url,
    homepage: packageJson.homepage,
  };
}

function packageRecordsFromLock(lock) {
  const packages = lock.packages || {};
  const records = [];
  const seen = new Set();
  for (const [lockPackagePath, meta] of Object.entries(packages)) {
    if (!lockPackagePath.startsWith('node_modules/')) {
      continue;
    }
    const name = meta.name || packageNameFromLockPath(lockPackagePath);
    const version = meta.version || '';
    const key = `${name}@${version}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    records.push({ lockPackagePath, meta });
  }
  return records.sort((a, b) => {
    const aName = a.meta.name || packageNameFromLockPath(a.lockPackagePath);
    const bName = b.meta.name || packageNameFromLockPath(b.lockPackagePath);
    return `${aName}@${a.meta.version}`.localeCompare(`${bName}@${b.meta.version}`);
  });
}

function writePackageLicenseFiles(record) {
  const licenseKey = record.selectedLicense || record.licenseExpression;
  const relativeLicensePath = `LICENSES/${sanitizeLicenseFileName(licenseKey)}.txt`;
  const licensePath = path.join(root, relativeLicensePath);

  const canonicalText = canonicalizeLicenseText(record.licenseText);
  const effectiveLicenseText = canonicalText || [
    `License expression: ${record.licenseExpression}`,
    '',
    'The upstream package tarball did not contain a dedicated LICENSE/COPYING file.',
    'The license expression above was read from the exact npm package version metadata.',
    'Check the upstream package before changing this dependency or publishing a new major release.',
  ].join('\n');

  writeTextIfMissing(
    licensePath,
    [
      `License file: ${licenseKey}`,
      '',
      'This file is stored once for all packages using this license in Gremia.SBV.',
      'Package-specific copyright and notice hints are collected in THIRD_PARTY_NOTICES.txt.',
      '',
      effectiveLicenseText.trim(),
      '',
    ].join('\n'),
  );

  return {
    licenseFile: relativeLicensePath,
  };
}

function renderInventory(records) {
  const lines = [];
  lines.push('THIRD-PARTY LICENSE INVENTORY');
  lines.push('Gremia.SBV');
  lines.push('');
  lines.push('Generated from package-lock.json, npm registry metadata and package tarballs.');
  lines.push('Regenerate after dependency changes with: npm run licenses:generate');
  lines.push('');
  lines.push('This inventory lists third-party Node/Electron dependencies.');
  lines.push('Each dependency remains licensed by its upstream project.');
  lines.push('License texts are stored once per used license below LICENSES/. Copyright notices are collected per package in THIRD_PARTY_NOTICES.txt.');
  lines.push('');
  for (const record of records) {
    lines.push(`- ${record.name}@${record.version}`);
    lines.push(`  License: ${record.licenseExpression}`);
    if (record.selectedLicense) {
      lines.push(`  Selected license for OR expression: ${record.selectedLicense}`);
    }
    lines.push(`  License text: ${record.licenseFile}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderNotices(records) {
  const lines = [];
  lines.push('THIRD-PARTY NOTICES');
  lines.push('Gremia.SBV');
  lines.push('');
  lines.push('Generated from npm package metadata, package tarballs and extracted notice/copyright hints.');
  lines.push('Regenerate after dependency changes with: npm run licenses:generate');
  lines.push('');
  for (const record of records) {
    lines.push(`${record.name}@${record.version}`);
    lines.push(`License: ${record.licenseExpression}${record.selectedLicense ? `; selected: ${record.selectedLicense}` : ''}`);
    if (record.repository) {
      lines.push(`Repository: ${record.repository}`);
    }
    if (record.homepage) {
      lines.push(`Homepage: ${record.homepage}`);
    }
    if (record.copyrightHints.length > 0) {
      lines.push('Copyright notices:');
      for (const hint of record.copyrightHints) {
        lines.push(`- ${hint}`);
      }
    } else {
      lines.push('Copyright notices: none detected in package metadata or distributed notice files.');
    }
    lines.push(`License text: ${record.licenseFile}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  if (!fs.existsSync(lockPath)) {
    throw new Error('package-lock.json fehlt; Lizenzinventar kann nicht erzeugt werden.');
  }

  removeDirectoryContents(licensesRoot);
  const lock = readJson(lockPath);
  const packageEntries = packageRecordsFromLock(lock);
  const resolvedRecords = [];

  for (const entry of packageEntries) {
    const record = await resolvePackageRecord(entry.lockPackagePath, entry.meta);
    const files = writePackageLicenseFiles(record);
    resolvedRecords.push({ ...record, ...files });
  }

  resolvedRecords.sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));
  writeTextIfChanged(inventoryPath, renderInventory(resolvedRecords));
  writeTextIfChanged(noticesPath, renderNotices(resolvedRecords));
  console.log(`Wrote ${resolvedRecords.length} third-party license records to ${path.relative(root, inventoryPath)}.`);
  console.log(`Wrote shared license texts below ${path.relative(root, licensesRoot)}.`);
  console.log(`Wrote copyright notices to ${path.relative(root, noticesPath)}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
