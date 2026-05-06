# Gremia.SBV

**Gremia.SBV** ist eine lokale, offline-first Desktop-Anwendung für die vertrauliche Fallarbeit der Schwerbehindertenvertretung (SBV).

Stand: **0.8.12-c**  
Zielrichtung: Vorbereitung auf den ersten Release Candidate `0.9.0-rc.1`.

## Zweck

Gremia.SBV unterstützt die SBV bei personenbezogener, besonders vertraulicher Fallarbeit. Die App bündelt Fallakten, Maßnahmen, Fristen, Dokumente, Vorlagen, Berichte und Compliance-Prüfpunkte in einem lokalen Tresor.

Die zentrale Produktregel lautet:

> Die Fallakte führt. Maßnahmen schreiben fort. Cockpits überwachen. Inlinebefehle beschleunigen. Berichte werten aus.

## Kernfunktionen

- Fallakten für vertrauliche SBV-Vorgänge
- Maßnahmen innerhalb der Fallakte, unter anderem:
  - BEM
  - Prävention
  - SBV-Beteiligung
  - Kündigungsanhörung
  - Gleichstellung / GdB
  - Arbeitsplatzgestaltung
- Fristen und Wiedervorlagen
- Dokumentenimport in den lokalen Tresor
- Vorlagen und strukturierte Schreiben
- Inline-Kurzbefehle für Live-Protokolle
- Berichte und System-/Integritätsberichte
- Compliance-Dokumente wie TOMs, VVT, DSFA-Entwurf und Release-Checkliste
- lokales Audit-Log mit Hash-Chain
- Auto-Lock und Sicherheitsstatus

## Datenschutz und Sicherheitsmodell

Gremia.SBV ist bewusst **offline-first** gebaut:

- keine Cloud-Synchronisation,
- keine Telemetrie,
- keine automatische externe Schnittstelle,
- lokale verschlüsselte Datenhaltung,
- Auditierung von Zugriffen und Änderungen,
- temporäre Arbeitskopien werden kontrolliert,
- Berichte werden lokal erzeugt.

Die App ersetzt keine organisatorische Datenschutzfreigabe. Vor produktiver Nutzung sind insbesondere DSB, IT-Security und die verantwortliche Stelle einzubeziehen.

Wichtige Dokumente:

- `docs/SECURITY.md`
- `docs/DATENSCHUTZKONZEPT.md`
- `docs/DSGVO_SBV.md`
- `docs/DSFA_SBV_TEMPLATE.md`
- `docs/VERARBEITUNGSVERZEICHNIS_SBV.md`
- `docs/LOESCHKONZEPT_SBV.md`

## Architekturüberblick

Die Anwendung besteht aus:

- React/Vite-Renderer unter `src/app/`
- Electron Main/Preload unter `electron/`
- Services unter `services/`
- Datenbankschema und Migrationen unter `database/`
- Build- und Wartungsskripten unter `scripts/`
- Tests unter `tests/`
- Projektdokumentation unter `docs/`

Weitere Details stehen in:

- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT.md`
- `docs/RELEASE_CHECKLIST.md`

## Voraussetzungen

- Node.js in der vom Projekt verwendeten LTS-Version
- npm
- Linux-Desktop für den AppImage-Build
- native Build-Abhängigkeiten für Electron/SQLite, siehe `docs/NATIVE_SQLCIPHER_DEPENDENCY.md`

Nach `npm install` wird automatisch ausgeführt:

```bash
electron-builder install-app-deps
```

Das ist in `package.json` als `postinstall` hinterlegt.

## Entwicklung

```bash
npm install
npm run dev
```

Der Entwicklungsmodus startet Renderer und Electron gemeinsam.

## Tests

```bash
npm run test
```

Vor dem Testlauf werden Versionen erzeugt und obsolete Source-Dateien bereinigt.

Gezielte Testgruppen:

```bash
npm run test:privacy
npm run test:migrations
npm run test:backup
npm run test:review-fixes-0810
```

## Build

```bash
npm run build
```

Der normale Build-Lauf führt die Vitest-Suite vor der Kompilierung aus.

Linux-AppImage:

```bash
npm run build:linux
```

Vor dem Build laufen:

1. Versionsgenerierung,
2. Source-Cleanup,
3. Build-Readiness-Check.

## Source-Cleanup

Obsolete Dateien werden über explizite Manifeste unter `maintenance/source-cleanup/` entfernt.

```bash
npm run source:cleanup
npm run source:cleanup:dry-run
```

Der Cleanup akzeptiert nur explizite relative Pfade in bekannten Projektbereichen. Keine Wildcards, keine absoluten Pfade und kein Zugriff außerhalb des Projekt-Roots.

## Release-Vorbereitung

Vor dem ersten RC müssen mindestens erfolgreich sein:

```bash
npm ci
npm run rc:check
npm run test
npm run build
npm run build:linux
```

Der RC-Check prüft die statische Release-Verkabelung, die Dokumentationsstruktur, Versionskonsistenz und obsolete Testskriptverweise. Zusätzlich sind manuell zu prüfen:

- frische Tresor-/Datenbankanlage,
- Migration einer bestehenden Datenbank,
- Backup und Restore,
- Audit-Hash-Chain und Manipulationserkennung,
- Report- und PDF-Erzeugung,
- temporäre Dateien,
- Auto-Lock,
- Inlinebefehle in Fallaktenprotokollen,
- responsive UI.

Siehe `docs/RELEASE_CHECKLIST.md`.

## Projektstatus

Gremia.SBV befindet sich in der späten Vorbereitungsphase vor `0.9.0-rc.1`. Bis zum RC sollen keine neuen großen Fachmodule ergänzt werden. Fokus ist jetzt Stabilisierung, Dokumentation, Testhärtung, Migration und UI-Polish.

## Grenzen

Gremia.SBV ist ein Arbeitswerkzeug für die SBV. Die App ersetzt keine Rechtsberatung, keine Datenschutzfreigabe und keine fachliche Prüfung durch SBV, DSB, IT-Security oder anwaltliche Beratung.
