# Dependency-Update-Policy

Gremia.SBV bleibt offline-first und muss reproduzierbar aus öffentlichen Paketquellen gebaut werden. Dependabot darf Versionen aktuell halten, aber keine neue Installations- oder Build-Strategie einführen.

## Verbindliche Regeln

- `npm install` darf keine internen Registry-URLs oder SSH-Git-Abhängigkeiten benötigen.
- Native Electron-Abhängigkeiten werden über `node scripts/install-electron-app-deps.cjs` vorbereitet.
- Der Bootstrap darf weder `npx` noch `npm exec` verwenden, damit npm-Workspace-Flags aus npm 11 nicht in `electron-builder` hineinlaufen.
- `@electron/rebuild` wird nicht als direkte Projektabhängigkeit gepflegt; die Rebuild-Kette kommt über `electron-builder`.
- Major-Updates von `electron`, `electron-builder` und `better-sqlite3-multiple-ciphers` werden nicht automatisch übernommen.
- GitHub Actions werden für Dependabot-PRs nicht zusätzlich aktiviert; der Bereitstellungsworkflow bleibt tagbasiert.

## Lokale Prüfung vor Merge eines Dependabot-PRs

```bash
npm ci --ignore-scripts
npm run dependency:hygiene
npm run test
npm run build:readiness
npx tsc -p tsconfig.json --noEmit
npx tsc -p tsconfig.electron.json --noEmit
npm audit --audit-level=moderate
```

Native Abhängigkeiten werden danach explizit geprüft:

```bash
npm run native:install-app-deps
```
