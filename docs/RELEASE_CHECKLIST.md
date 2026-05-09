# Release-Checkliste für 0.9.1

Stand: 0.9.1

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
- Coverage-Scope RC-kritische Service-Verträge,
- mindestens 70 Prozent für Branches, Functions, Lines und Statements.

Das Gate wird über `npm run test:coverage` und `npm run release:check` ausgeführt.

## GitHub Release Build

Ein GitHub-Draft-Release wird durch einen Tag ausgelöst:

```bash
git tag v0.9.1
git push origin v0.9.1
```

Der Workflow `.github/workflows/build-release.yml` muss dann erzeugen:

- Linux-Artefakt,
- Windows-Artefakt,
- macOS-Artefakt unsigniert/nicht notarisiert,
- GitHub Draft Release mit Artefakten.

Der Workflow muss Tag und `package.json.version` abgleichen. `v0.9.1` darf nur zu `package.json` Version `0.9.1` passen.

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

Nach `0.9.0-rc.1-p` werden keine neuen Fachfunktionen mehr aufgenommen. Zulässig sind nur:

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
- [x] Known Issues final sind
- [x] Release Notes für `0.9.0-rc.1-p` erstellt sind
- [x] Doku-Stände mit `package.json.version` konsistent sind oder bewusst versionsfrei formuliert sind
- [x] `postinstall` exakt `electron-builder install-app-deps` ist


## Freeze-Regel nach RC1

Nach `0.9.0-rc.1-p` sind nur noch Security-Fixes, Datenverlust-/Migrationsfixes, Buildfixes, Testfixes, Dokumentationskorrekturen und offensichtliche UI-Bugs ohne neue Fachlogik zulässig. Neue Fachfeatures, neue Inlinebefehle, neue Module, große Refactorings und neue Datenbankstrukturen ohne zwingenden Fehlergrund sind ausgeschlossen.

## RC-Freeze-Regel 0.9.0-rc.1-p

Für 0.9.0-rc.1-p gilt: Nur Bugfixes, Buildfixes, Security-Fixes, Datenverlust-/Migrationsfixes, offensichtliche UI-Bugs und Dokumentationskorrekturen. Es gibt keine neuen Fachfeatures, keine Cloud-Synchronisation und keine Lizenzänderung weg von AGPL-3.0-or-later.
