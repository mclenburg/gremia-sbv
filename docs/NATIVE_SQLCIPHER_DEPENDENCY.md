# Native SQLCipher-Abhängigkeit

## Abhängigkeit

Gremia.SBV nutzt `better-sqlite3-multiple-ciphers` als native SQLite-/SQLCipher-kompatible Abhängigkeit.

## Rebuild

```bash
npm run native:rebuild
npm run native:diagnose
```

Nach Installation sorgt `electron-builder install-app-deps` dafür, dass native Abhängigkeiten zur Electron-Version passen.

## Plattformen

Native Builds müssen für Linux, Windows und macOS geprüft werden. Tests dürfen nicht von einem bestimmten Betriebssystempfad abhängen.
