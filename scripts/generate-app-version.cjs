#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const targetDir = path.join(projectRoot, 'src', 'app', 'generated');
const targetPath = path.join(targetDir, 'appVersion.ts');
const serviceTargetDir = path.join(projectRoot, 'services', 'generated');
const serviceTargetPath = path.join(serviceTargetDir, 'appMetadata.ts');

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = String(pkg.version || '0.0.0');
const name = String(pkg.name || 'gremia-sbv');

fs.mkdirSync(targetDir, { recursive: true });
fs.mkdirSync(serviceTargetDir, { recursive: true });
const generatedSource = [
  '// Diese Datei wird automatisch aus package.json erzeugt.',
  '// Nicht manuell ändern. Änderungen erfolgen über scripts/generate-app-version.cjs.',
  `export const APP_VERSION = ${JSON.stringify(version)};`,
  `export const APP_PACKAGE_NAME = ${JSON.stringify(name)};`,
  ''
].join('\n');

fs.writeFileSync(targetPath, generatedSource, 'utf8');
fs.writeFileSync(serviceTargetPath, generatedSource, 'utf8');

console.log(`Gremia.SBV App-Version erzeugt: ${version}`);
