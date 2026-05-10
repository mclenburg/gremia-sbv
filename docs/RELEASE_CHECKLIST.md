# Release-Checkliste Gremia.SBV

Stand: **0.9.1**

Diese Checkliste ist das Gate vor dem 1.0-Freeze. Sie ersetzt keine Datenschutzfreigabe, sondern bündelt technische, fachliche und organisatorische Prüfungen.

## Pflichtläufe

```bash
npm run rc:check
npm run test
npm run test:e2e
npm run test:coverage
npm run release:check
npm run build:linux
npm run build:win
```

macOS wird auf einem passenden macOS-Runner gebaut:

```bash
npm run build:mac
```

## Fachliche Abnahme

- [ ] Personenverzeichnis enthält kein GdB-Standardfeld und keine Diagnosen.
- [ ] Personalnummer ist optional.
- [ ] CSV-/XLSX-Import prüft Vorschau, Mapping, Validierung und Ergebnis.
- [ ] Vollnamen-Spalten wie `Nachname, Vorname` werden unterstützt.
- [ ] Reguläre neue Fallakten werden an eine Person gebunden.
- [ ] Anonyme Beratungsanfrage ist ohne Direktidentifikatoren möglich.
- [ ] Statusablauf und Beschäftigungsende erzeugen Datenschutzprüfung.
- [ ] Fortspeicherung braucht Grund und erneuten Prüftermin.
- [ ] iCal-Export nutzt `process_type` als Standard und enthält keine Namen.

## Datenschutz und Compliance

- [ ] DSFA-Entwurf enthält Personenverzeichnis, Fallaktenbindung, anonyme Anfrage und iCal-Export.
- [ ] TOMs enthalten SQLCipher, ExportGuard, Audit-ohne-Direktidentifikatoren und Lösch-/Anonymisierungsworkflow.
- [ ] VVT enthält die neue Verarbeitungstätigkeit Personenverzeichnis.
- [ ] Rechtsgrundlagen enthalten Art. 6 Abs. 1 lit. c DSGVO, Art. 9 Abs. 2 lit. b DSGVO, § 26 Abs. 3 BDSG, § 163 SGB IX, § 164 Abs. 4 SGB IX, § 178 Abs. 1 SGB IX und § 178 Abs. 2 Satz 1 SGB IX.
- [ ] Art. 13/14-Hinweis ist organisatorisch beschrieben.
- [ ] Art. 15-Auskunftsfähigkeit ist als Compliance-Anwendungsfall dokumentiert.

## Barrierefreiheit und Responsivität

- [ ] Personenmodul, Import-Assistent, Personenauswahl, anonyme Anfrage und Datenschutzdialog sind per Tastatur bedienbar.
- [ ] Dialoge haben `role="dialog"`, `aria-modal`, sinnvolle Labels und Fokus-Rückkehr.
- [ ] `useAnnouncer` meldet Import, Auswahl, Verknüpfung, Anonymisierung und Löschung.
- [ ] Es gibt keine horizontalen Überläufe in den E2E-Standard-Viewports.

## Build und Release

- [ ] Linux erzeugt AppImage.
- [ ] Windows erzeugt portable EXE, keinen verpflichtenden Installer.
- [ ] macOS-Artefakt ist unsigniert und nicht notarisiert dokumentiert.
- [ ] GitHub-Release-Upload enthält nur `.exe`, `.AppImage` und `.dmg`; `latest*.yml`, `.blockmap` und zusätzliche ZIPs werden nicht hochgeladen.
- [ ] Release Notes für `0.9.1` existieren.
- [ ] README, Roadmap, Known Issues, Build-Doku und Lizenzpolitik nennen `0.9.1`.

## Freeze-Regel

Nach `0.9.1` werden keine neuen Fachfunktionen mehr aufgenommen. Zulässig sind nur Security-Fixes, Datenverlust-/Migrationsfixes, Buildfixes, Testfixes, Dokumentationskorrekturen und offensichtliche UI-Bugs ohne neue Fachlogik. Neue Fachfeatures, neue Inlinebefehle, neue Module, große Refactorings und neue Datenbankstrukturen ohne zwingenden Fehlergrund sind ausgeschlossen.

## RC-Freeze-Regel 0.9.1

Für 0.9.1 gilt: Nur Bugfixes, Buildfixes, Security-Fixes, Datenverlust-/Migrationsfixes, offensichtliche UI-Bugs und Dokumentationskorrekturen. Es gibt keine neuen Fachfeatures, keine Cloud-Synchronisation und keine Lizenzänderung weg von AGPL-3.0-or-later.
