const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const packagePath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const pkg = readJson(packagePath);

if (!pkg.version || typeof pkg.version !== 'string') {
  throw new Error('package.json enthält keine gültige version.');
}

if (!fs.existsSync(lockPath)) {
  console.log('Package-Lock-Sync: package-lock.json nicht vorhanden, nichts zu tun.');
  process.exit(0);
}

const lock = readJson(lockPath);
let changed = false;

if (lock.version !== pkg.version) {
  lock.version = pkg.version;
  changed = true;
}

if (lock.packages && lock.packages[''] && lock.packages[''].version !== pkg.version) {
  lock.packages[''].version = pkg.version;
  changed = true;
}

if (changed) {
  writeJson(lockPath, lock);
  console.log(`Package-Lock-Sync: package-lock.json auf ${pkg.version} aktualisiert.`);
} else {
  console.log(`Package-Lock-Sync: package-lock.json ist bereits auf ${pkg.version}.`);
}
