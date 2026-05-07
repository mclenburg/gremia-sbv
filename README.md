# Gremia.SBV – lokale Software für Schwerbehindertenvertretungen

**Gremia.SBV** ist eine lokale, offline-first Desktop-App für Schwerbehindertenvertretungen in Deutschland. Sie unterstützt vertrauliche SBV-Fallarbeit rund um BEM, Präventionsverfahren nach § 167 SGB IX, SBV-Beteiligung nach § 178 SGB IX, Kündigungsanhörungen, Gleichstellung/GdB, Arbeitsplatzanpassung, Fristen, Dokumentation und Tätigkeitsberichte – ohne Cloud, ohne Telemetrie und ohne HR-Zugriff.

Stand: **0.8.13-g**  
Zielrichtung: RC-Härtung vor dem ersten Release Candidate `0.9.0-rc.1`.

## Kurzüberblick

Gremia.SBV ist eine **SBV Software** für die besonders vertrauliche Fallarbeit der Schwerbehindertenvertretung. Die Anwendung bündelt Fallakten, Gesprächsnotizen, Live-Protokolle, Maßnahmen, Fristen, Dokumente, Vorlagen, Datenschutzdokumente und Berichte in einem lokalen Arbeitsbereich.

Die Produktregel lautet:

> Die Fallakte führt. Maßnahmen schreiben fort. Cockpits überwachen. Inlinebefehle beschleunigen. Berichte werten aus.

## Was Gremia.SBV besonders macht

- **SBV-first:** entwickelt für die vertrauliche Arbeit der Schwerbehindertenvertretung, nicht als HR-Kontrollsystem.
- **Offline-first:** lokale Desktop-App ohne Cloud-Synchronisation, ohne Telemetrie und ohne externe Datenübertragung.
- **Prozessnah:** BEM, Prävention, Beteiligung, Kündigungsanhörung, Gleichstellung/GdB, Arbeitsplatzanpassung und Fristen bleiben in einer Fallakte nachvollziehbar verbunden.
- **Lebende Arbeitschronik:** Notizen, Maßnahmen, Fristen und interne Aktenbezüge bilden eine nachvollziehbare Arbeitschronik statt einer losen Dateiablage.
- **Datenschutzbewusst:** lokale Verschlüsselung, sparsame Audit-Metadaten, kontrollierte Backups und exportfreundliche Berichte ohne unnötige technische IDs.
- **Menschliche Verantwortung bleibt erhalten:** Die App unterstützt Dokumentation und Nachvollziehbarkeit, ersetzt aber keine rechtliche Bewertung, keine Datenschutzfreigabe und keine organisatorische Entscheidung.

## Für wen ist Gremia.SBV gedacht?

Gremia.SBV richtet sich an gewählte Vertrauenspersonen der schwerbehinderten Menschen, stellvertretende Mitglieder und kleine SBV-Teams, die eine lokale Software für Schwerbehindertenvertretungen suchen und besonders sensible personenbezogene Daten datenschutzbewusst strukturieren möchten.

Typische Einsatzfelder:

- BEM Dokumentation und Maßnahmenverfolgung,
- Präventionsverfahren nach § 167 SGB IX,
- Beteiligung der SBV nach § 178 SGB IX,
- Kündigungsanhörungen schwerbehinderter oder gleichgestellter Menschen,
- Gleichstellung/GdB-Verfahren,
- behinderungsgerechte Arbeitsplatzgestaltung,
- Fristen, Wiedervorlagen und Tätigkeitsberichte.

## Datenschutz: lokal statt Cloud

Gremia.SBV verarbeitet besonders sensible personenbezogene Daten. Deshalb ist die Anwendung konsequent offline-first konzipiert:

- keine Cloud-Synchronisation,
- keine Telemetrie,
- keine Mehrbenutzer- oder Serverfunktion,
- lokale verschlüsselte Datenhaltung,
- kontrollierte Backups,
- sparsame Audit-Metadaten,
- keine Übertragung an externe Dienste.

Die App ersetzt keine organisatorische Datenschutzfreigabe. Vor produktiver Nutzung sind insbesondere Datenschutzbeauftragte, IT-Security und die verantwortliche Stelle einzubeziehen.

## Unterstützte SBV-Prozesse

- Fallakten für vertrauliche SBV-Vorgänge
- Live-Protokolle und Gesprächsnotizen mit internen Aktenbezügen
- BEM, Prävention, SBV-Beteiligung, Kündigungsanhörung, Gleichstellung/GdB und Arbeitsplatzgestaltung
- Fristen und Wiedervorlagen
- Dokumentenimport in den lokalen Tresor
- Vorlagen und strukturierte Schreiben
- Berichte und System-/Integritätsberichte
- Compliance-Dokumente wie TOMs, VVT, DSFA-Entwurf und Release-Checkliste
- lokales Audit-Log mit Hash-Chain
- Auto-Lock und Sicherheitsstatus

## Grenzen der Software

Gremia.SBV ist ein Arbeitswerkzeug für die SBV. Die Anwendung bietet keine Rechtsberatung und trifft keine menschlichen oder organisatorischen Freigabeentscheidungen. Sie bewertet technische Zustände, unterstützt Dokumentation und macht Vorgänge nachvollziehbar – die rechtliche Bewertung und Interessenvertretungsentscheidung bleiben bei den zuständigen Menschen.

## Installation und Build

Voraussetzungen:

- Node.js in der vom Projekt verwendeten LTS-Version,
- npm,
- native Build-Abhängigkeiten für Electron/SQLite,
- Linux-Desktop für AppImage-Builds,
- Windows 10+ für Windows-Builds.

Nach `npm install` werden native Electron-Abhängigkeiten automatisch passend zur Electron-Version gebaut:

```bash
npm install
```

Der dafür verbindliche Vertrag in `package.json` lautet:

```json
"postinstall": "electron-builder install-app-deps"
```

Entwicklung:

```bash
npm run dev
```

Build:

```bash
npm run build
npm run build:linux
npm run build:win
```

## Tests und Qualitätssicherung

```bash
npm run test
npm run rc:check
npm run build:readiness:strict
```

E2E-Tests laufen ausschließlich mit isolierten temporären Testdaten:

```bash
npm run test:e2e:setup
npm run test:e2e
```

## Dokumentation

- `docs/BUILD.md`
- `docs/E2E_TESTS.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/SECURITY.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/CHANGELOG.md`

## Release-Status

Gremia.SBV befindet sich in der RC-Härtung vor `0.9.0-rc.1`. Bis zum Release Candidate stehen Stabilisierung, Migration, E2E, Barrierefreiheit, Datenschutz-/Security-Readiness und Dokumentationsreife im Vordergrund.
