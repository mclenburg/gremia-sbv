const path = require('node:path');

console.log('Gremia.SBV native SQLCipher Diagnose');
console.log('------------------------------------');
console.log('Node:', process.version, 'modules ABI:', process.versions.modules);
console.log('Electron package:', safePkgVersion('electron'));
console.log('better-sqlite3-multiple-ciphers package:', safePkgVersion('better-sqlite3-multiple-ciphers'));

try {
  const Database = require('better-sqlite3-multiple-ciphers');
  console.log('OK: better-sqlite3-multiple-ciphers kann unter dem aktuellen Node-Prozess geladen werden.');
  console.log('Hinweis: Für Electron muss zusätzlich gegen Electron neu gebaut sein.');
  if (Database) process.exit(0);
} catch (error) {
  console.error('FEHLER: Native Dependency kann unter dem aktuellen Node-Prozess nicht geladen werden.');
  console.error(error && error.message ? error.message : error);
  console.error('\nNächster Schritt: npm run native:rebuild:electron');
  process.exit(1);
}

function safePkgVersion(name) {
  try {
    const pkgPath = require.resolve(path.join(name, 'package.json'));
    return require(pkgPath).version;
  } catch (_) {
    return 'nicht gefunden';
  }
}
