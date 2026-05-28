# Native SQLCipher-Abhängigkeit

## Abhängigkeit

Gremia.SBV nutzt `better-sqlite3-multiple-ciphers` als native SQLite-/SQLCipher-kompatible Abhängigkeit.

## Rebuild

```bash
npm run native:rebuild
npm run native:diagnose
```

Nach Installation sorgt `node scripts/install-electron-app-deps.cjs` dafür, dass die lokal installierte `electron-builder`-CLI mit bereinigter npm-Umgebung `install-app-deps` ausführt. So passen native Abhängigkeiten zur Electron-Version, ohne npm-Workspace-Flags aus npm 11 weiterzureichen.

## Plattformen

Native Builds müssen für Linux, Windows und macOS geprüft werden. Tests dürfen nicht von einem bestimmten Betriebssystempfad abhängen.
