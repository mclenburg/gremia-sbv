#!/usr/bin/env node
const { rmSync } = require('node:fs');
const { join } = require('node:path');

const target = join(process.cwd(), 'node_modules', 'better-sqlite3-multiple-ciphers', 'build');
rmSync(target, { recursive: true, force: true });
console.log(`Native Build-Verzeichnis bereinigt: ${target}`);
