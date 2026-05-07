# Release-Checkliste bis 0.9.0-rc.1

Stand: 0.8.13-l

## Automatisierte Mindestprüfung lokal

```bash
npm ci
npm run rc:check
npm run test
npm run test:coverage
npm run build
npm run build:linux
npm run build:win
npm run build:readiness:strict
npm run release:check
```

Optional, wenn lokal eingerichtet:

```bash
npm run test:e2e
npm run build:mac
```

## Service-Coverage-Gate

Für den RC gilt:

- `vitest --coverage` mit `provider: 'v8'`,
- Coverage-Scope `services/**/*.ts`,
- mindestens 70 Prozent für Branches, Functions, Lines und Statements.

Das Gate wird über `npm run test:coverage` und `npm run release:check` ausgeführt.

## GitHub Release Build

Ein GitHub-Draft-Release wird durch einen Tag ausgelöst:

```bash
git tag v0.9.0-rc.1
git push origin v0.9.0-rc.1
```

Der Workflow `.github/workflows/build-release.yml` muss dann erzeugen:

- Linux-Artefakt,
- Windows-Artefakt,
- macOS-Artefakt unsigniert/nicht notarisiert,
- GitHub Draft Release mit Artefakten.

Der Workflow muss Tag und `package.json.version` abgleichen. `v0.9.0-rc.1` darf nur zu `package.json` Version `0.9.0-rc.1` passen.

## Manuelle Abnahme

- frischen Tresor anlegen
- bestehende Datenbank migrieren
- Fallakte anlegen
- Notiz/Protokoll erfassen
- Inlinebefehle `/bem`, `/praev`, `/bet`, `/kuend`, `/gleich`, `/anp` und `/fr` testen
- klickbare Aktenbezüge öffnen
- Export ohne technische UUIDs prüfen
- Dokument importieren und öffnen
- Vorlagen verwenden
- Berichte erzeugen
- Compliance-Dokumente erzeugen
- Backup erstellen
- Restore testen
- Auto-Lock testen
- Unlock-Delay testen
- Audit-Hash-Chain prüfen
- Manipulationserkennung testen
- temporäre Dateien bereinigen
- Responsivität in mehreren Auflösungen prüfen
- Tastaturbedienung und Screenreader-Labels prüfen

## RC-Regel

Nach `0.9.0-rc.1` werden keine neuen Fachfunktionen mehr aufgenommen. Zulässig sind nur:

- Security-Fixes,
- Datenverlust-/Migrationsfixes,
- Buildfixes,
- Testfixes,
- Dokumentationskorrekturen,
- offensichtliche UI-Bugs ohne neue Fachlogik.

Nicht zulässig sind:

- neue Fachfeatures,
- neue Inlinebefehle,
- neue Module,
- größere Refactorings,
- neue Datenbankstruktur ohne zwingenden Fehlergrund,
- Cloud-, Sync- oder Mehrbenutzerfunktionen.

## RC-Härtung abgeschlossen, wenn

- [ ] `npm run release:check` grün ist
- [ ] Linux-Build grün ist
- [ ] Windows-Build grün ist
- [ ] GitHub-Draft-Release Linux/Windows/macOS erzeugt
- [ ] Known Issues final sind
- [ ] Release Notes für `0.9.0-rc.1` erstellt sind
- [ ] Doku-Stände mit `package.json.version` konsistent sind oder bewusst versionsfrei formuliert sind
- [ ] `postinstall` exakt `electron-builder install-app-deps` ist
