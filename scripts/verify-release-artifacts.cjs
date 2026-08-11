#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const target = (process.argv[2] || '').toLowerCase();
const root = process.cwd();
const releaseDir = path.join(root, 'release');
const sinceIndex = process.argv.indexOf('--since');
const explicitSince = sinceIndex >= 0 ? Number(process.argv[sinceIndex + 1]) : Number.NaN;
const writeReceipt = process.argv.includes('--write-receipt');

const contracts = {
  linux: {
    extension: '.AppImage',
    magic: Buffer.from([0x7f, 0x45, 0x4c, 0x46]),
    minimumBytes: 25 * 1024 * 1024,
  },
  win: {
    extension: '.exe',
    magic: Buffer.from([0x4d, 0x5a]),
    minimumBytes: 25 * 1024 * 1024,
  },
  windows: null,
  mac: {
    extension: '.dmg',
    magic: null,
    minimumBytes: 1 * 1024 * 1024,
  },
};
contracts.windows = contracts.win;

function fail(message) {
  throw new Error(`Release-Artefaktprüfung fehlgeschlagen: ${message}`);
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const result = [];
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isSymbolicLink()) fail(`Symlink im Releaseverzeichnis: ${path.relative(root, absolute)}`);
      if (entry.isDirectory()) pending.push(absolute);
      else if (entry.isFile()) result.push(absolute);
    }
  }
  return result;
}

function canonicalTarget(value) {
  return value === 'windows' ? 'win' : value;
}

function receiptPath(value) {
  return path.join(releaseDir, `.gremia-sbv-${canonicalTarget(value)}-artifact.json`);
}

function readReceipt(value) {
  const pathname = receiptPath(value);
  if (!fs.existsSync(pathname)) {
    fail(`Buildbeleg fehlt: ${path.relative(root, pathname)}. Zuerst das Plattform-Paket bauen.`);
  }
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(pathname, 'utf8'));
  } catch (error) {
    fail(`Buildbeleg ist ungültig: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (receipt?.version !== 1 || receipt?.target !== canonicalTarget(value)) {
    fail('Buildbeleg passt nicht zur angeforderten Plattform.');
  }
  if (!Number.isFinite(receipt.since) || receipt.since <= 0) {
    fail('Buildbeleg enthält keinen gültigen Buildstart-Zeitstempel.');
  }
  if (typeof receipt.artifact !== 'string' || !receipt.artifact) {
    fail('Buildbeleg enthält keinen gültigen Artefaktnamen.');
  }
  if (!Number.isFinite(receipt.size) || receipt.size <= 0 || !Number.isFinite(receipt.mtimeMs) || receipt.mtimeMs <= 0) {
    fail('Buildbeleg enthält keine gültigen Artefaktmetadaten.');
  }
  return receipt;
}

function writeBuildReceipt(value, since, artifact, stat) {
  const pathname = receiptPath(value);
  fs.writeFileSync(pathname, `${JSON.stringify({
    version: 1,
    target: canonicalTarget(value),
    since,
    artifact: path.basename(artifact),
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    verifiedAt: Date.now(),
  }, null, 2)}
`, 'utf8');
}

try {
  const contract = contracts[target];
  if (!contract) fail('Nutzung: node scripts/verify-release-artifacts.cjs <linux|win|mac> [--since <Zeitstempel>] [--write-receipt]');
  if (writeReceipt && (!Number.isFinite(explicitSince) || explicitSince <= 0)) {
    fail('--write-receipt benötigt einen gültigen Buildstart-Zeitstempel (--since <Millisekunden>).');
  }
  if (!fs.existsSync(releaseDir)) fail('release-Verzeichnis fehlt.');

  const receipt = Number.isFinite(explicitSince) && explicitSince > 0 ? null : readReceipt(target);
  const since = receipt ? receipt.since : explicitSince;
  if (!Number.isFinite(since) || since <= 0) fail('gültiger Buildstart-Zeitstempel fehlt (--since <Millisekunden>) und kein Buildbeleg ist verfügbar.');

  const files = walk(releaseDir);
  const candidates = files.filter((file) => {
    // Only top-level release files are end-user artifacts. Files such as
    // release/win-unpacked/Gremia.SBV.exe are internal packaging output.
    if (path.dirname(file) !== releaseDir) return false;
    if (!file.endsWith(contract.extension)) return false;
    return fs.statSync(file).mtimeMs >= since;
  });
  if (candidates.length !== 1) fail(`genau ein im aktuellen Build erzeugtes ${contract.extension}-Endanwenderartefakt erwartet, gefunden: ${candidates.length}`);

  const artifact = candidates[0];
  const name = path.basename(artifact);
  const stat = fs.statSync(artifact);
  if (stat.size < contract.minimumBytes) fail(`Artefakt ist unplausibel klein (${stat.size} Bytes): ${name}`);
  if (contract.magic) {
    const header = Buffer.alloc(contract.magic.length);
    const descriptor = fs.openSync(artifact, 'r');
    try { fs.readSync(descriptor, header, 0, header.length, 0); } finally { fs.closeSync(descriptor); }
    if (!header.equals(contract.magic)) fail(`Dateisignatur passt nicht zu ${contract.extension}: ${name}`);
  }

  if (receipt) {
    if (receipt.artifact !== name || receipt.size !== stat.size || Math.abs(receipt.mtimeMs - stat.mtimeMs) >= 1) {
      fail(`Artefakt stimmt nicht mehr mit dem Buildbeleg überein: ${name}`);
    }
  }
  if (writeReceipt) writeBuildReceipt(target, since, artifact, stat);

  console.log(`Release-Artefakt OK: ${name} (${stat.size} Bytes).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
