# Gremia.SBV

Gremia.SBV ist eine lokale, verschlüsselte Desktop-Anwendung für die vertrauliche Fallarbeit der Schwerbehindertenvertretung. Sie unterstützt SBV-Arbeit bei Fallakten, Protokollen, Fristen, Präventionsverfahren, Kontakten, Vorlagen, Wissensarbeit, Datenschutzprüfung, Backups und anonymisierten Berichten.

Die Anwendung ist bewusst **offline-first** gebaut: keine Cloud-Synchronisierung, keine Telemetrie, kein externer Login-Dienst und keine gemeinsame Fallakte mit Arbeitgeber oder Betriebsrat. SBV-Daten bleiben lokal, werden verschlüsselt gespeichert und werden nur durch bewusste Exporte aus der App herausgegeben.

## Stand: 0.4.47

Version 0.4.47 zieht Fallakten-Datenlogik, Registerfilter und Volltextsuche in eigene Hooks und Komponenten.

Erreicht:

- `App.tsx` ist wieder App-Shell statt Fachlogik-Sammelstelle.
- erste Fachansichten wurden aus der bisherigen Sammeldatei `workflowViews.tsx` herausgelöst.
- `TemplatesView` liegt jetzt in `src/app/features/templates/TemplatesView.tsx`.
- Erste Fallakten-Bausteine liegen jetzt in `src/app/features/cases/`.
- Fallakten-Formatierungslogik liegt in `src/app/features/cases/caseWorkbenchFormat.ts`.
- Fallakten-Datenlogik und Suche liegen in `useCaseWorkbenchData` und `useCaseWorkbenchSearch`.
- Präventionsübersicht, Wissensseite, Kontakte und Berichte liegen in Feature-Bereichen.
- gemeinsame Dialog- und Live-Region-Infrastruktur ist vorhanden.
- native `window.confirm`-Dialoge wurden durch eigene Industrial-Dialoge ersetzt.
- Versionsnummer wird beim Build generiert und in der UI angezeigt.
- README und Tests wurden auf den aktuellen Architekturstand gebracht.
- nicht implementierte externe Schnittstellen werden nicht als vorhandene Funktion dokumentiert.

Noch offen vor Version 1.0:

- `CasesView` weiter in Hooks, Formulare und Fachdetail-Komponenten schneiden.
- BEM, Kündigungsanhörung und Gleichstellung als echte Prozessmodule ausbauen.
- weitere fachliche Services aus UI-Dateien herausziehen.
- Tests stärker von Strukturtests zu Verhaltenstests ausbauen.

## Grundprinzipien

- **SBV-zentriert:** Die App ist für die einzelne Vertrauensperson gedacht, nicht für ein Gremium.
- **Offline-first:** Keine Serverpflicht, keine Cloud, keine Telemetrie.
- **Vertraulich:** Fallinformationen, Gesundheitsdaten und Gesprächsnotizen bleiben lokal.
- **Verschlüsselt:** Die Datenbank nutzt SQLCipher-kompatible Verschlüsselung.
- **Datensparsam:** Pseudonyme und anonymisierte Arbeit sind möglich.
- **Fristensicher:** Wiedervorlagen, Ampellogik, Dashboard-Hinweise und iCal-Export.
- **Barrierearm:** Tastaturnavigation, ARIA-Dialoge und Live-Regions werden schrittweise ausgebaut.
- **Bewusster Export:** PDFs, DOCX-nahe Texte, Backups und Berichte werden ausdrücklich erzeugt und geprüft.

## Hauptbereiche

### Dashboard

- Überblick über offene Fälle und Fristen
- kritische Wiedervorlagen
- Prozesshinweise
- Sicherheits- und Datenschutzstatus

### Fallakte

Die Fallakte ist das Hauptarbeitsinstrument.

Sie bündelt:

- Fallstammdaten
- Gesprächsnotizen und Protokolle
- Dokumente
- Kontakte
- Fristen
- Präventionsverfahren
- Rechts- und Normbezüge
- Vertraulichkeits- und Risikohinweise

Fachliche Vorgänge werden aus der Fallakte heraus bearbeitet. Übersichtsseiten führen nur in die jeweilige Fallakte zurück.

### Präventionsverfahren

- Übersicht nach Status
- erledigte Verfahren zugeklappt am Ende
- Deep-Link in die konkrete Maßnahme der Fallakte
- Vorlagenanbindung nach Maßnahmeart und Status

### BEM, Kündigungsanhörung und Gleichstellung

Diese Bereiche sind als Prozessmodule vorgesehen. Sie sollen dem gleichen Prinzip folgen:

```text
Übersichtsseite = Statuskontrolle
Fallakte        = eigentliche Bearbeitung
```

### Kontakte

- interne und externe Ansprechstellen
- Inklusionsamt, Agentur für Arbeit, Betriebsarzt, Integrationsfachdienst
- datenschutzsensible Löschung mit Anonymisierung bekannter Textbezüge

### Vorlagen

- Verwaltung von Standardtexten
- Platzhalter für Fall-, Frist-, SBV- und Arbeitgeberdaten
- statusgebundene Vorlagen für Maßnahmen
- Standardwerte in den Einstellungen

### Wissensdatenbank

- kompakte Ratgebertexte zu Normen
- Volltextsuche
- Register nach Rechtsquelle
- optionale Fallverknüpfung als nachrangige Funktion

### Berichte und Exporte

- Tätigkeitsbericht
- Datenschutz-Audit
- System-/Datenbankprüfung
- Exportwarnungen bei sensiblen Inhalten
- PDF-Erzeugung im hellen Drucklayout

### Backup und Wiederherstellung

- verschlüsselte Sicherungen
- Wiederherstellungslogik
- Validierung vor Import
- portable Nutzung bleibt Zielbild

## Technik

| Bereich | Technik |
|---|---|
| Desktop-Shell | Electron |
| Renderer | React + TypeScript |
| Build | Vite |
| lokale Datenbank | SQLite mit SQLCipher-kompatibler Verschlüsselung |
| nativer DB-Adapter | `better-sqlite3-multiple-ciphers` |
| Tests | Vitest |
| Paketierung | electron-builder / AppImage |

## Projektstruktur

```text
gremia-sbv/
├── electron/                     # Main-Prozess, Preload, IPC
├── src/
│   ├── main.tsx                  # Renderer-Einstieg
│   └── app/
│       ├── App.tsx               # App-Shell, Provider, Navigation
│       ├── workflowViews.tsx     # verbleibende Alt-/Übergangsansichten
│       ├── core/                 # Modelle, Navigation, Tastatur-Hooks
│       ├── features/             # Fachmodule
│       │   ├── contacts/
│       │   ├── knowledge/
│       │   ├── prevention/
│       │   ├── reports/
│       │   └── templates/
│       ├── shared/               # wiederverwendbare UI-, Dialog- und A11y-Komponenten
│       └── shell/                # Navigation und Layout
├── services/                     # Fachservices und Policies
├── database/                     # Schema, Migrationen, Seeds
├── scripts/                      # Build-, Diagnose- und Aufräumskripte
├── docs/                         # aktuelle Architektur-, Sicherheits- und Betriebsdokumentation
└── tests/                        # Policy-, Service-, UI- und Regressionstests
```

## Entwicklung

### Installation

```bash
npm install
```

### Entwicklung starten

```bash
npm run dev
```

### Tests

Gesamter Testlauf:

```bash
npm run test
```

Gezielte Läufe:

```bash
npm run test:privacy
npm run test:migrations
npm run test:backup
npm run test:prevention
npm run test:knowledge
npm run test:templates
npm run test:a11y
npm run test:refactor
npm run test:readme-final
```

### Build

```bash
npm run build
```

Linux-AppImage:

```bash
npm run build:linux
```

Windows-Build:

```bash
npm run build:win
```

Release-Check:

```bash
npm run release:check
```

## Native Abhängigkeiten

Bei Electron-/Node-Wechsel oder Plattformwechsel:

```bash
npm run native:clean
npm run native:rebuild
```

Diagnose:

```bash
npm run native:diagnose
```

## Aufräumen alter Refaktorierungsartefakte

0.4.43 bringt ein optionales Aufräumskript mit. Es entfernt nur klar benannte alte Build-Fix-/Zwischenstands-Dokumente und derzeit nicht implementierte externe Schnittstellen-Artefakte.

Trockenlauf:

```bash
node scripts/cleanup-legacy-artifacts.cjs --dry-run
```

Ausführen:

```bash
npm run cleanup:legacy
```

## Sicherheit und Datenschutz

Wichtige aktive Dokumente:

- `docs/SECURITY.md`
- `docs/DATENSCHUTZKONZEPT.md`
- `docs/DATABASE_ENCRYPTION.md`
- `docs/BACKUP_RESTORE.md`
- `docs/RETENTION_AND_TESTS.md`

Grundsatz:

```text
Was in der SBV-Fallakte steht, verlässt die App nur durch bewusste, nachvollziehbare Handlung.
```

## Textbefehle

Große Textfelder sollen über `TextCommandTextarea` laufen. Dadurch sind die Kürzel `//`, `@@`, `##`, `§§`, `!!`, `>>`, `^^` und `~~` technisch überall erkennbar und können modulbezogen verarbeitet werden. Die Fallaktenverarbeitung der Kürzel liegt in `useInlineCommands`. Die Notiz-/Protokoll-Editorlogik liegt in `useCaseNoteEditor`.

## Clean-Code-Leitlinie

Ab 0.4.43 gilt:

- `App.tsx` bleibt Shell und Orchestrierung.
- Neue Fachlogik kommt nicht zurück in `App.tsx`.
- Neue Fachmodule liegen unter `src/app/features/<modul>/`.
- Wiederverwendbare UI kommt nach `src/app/shared/`.
- Fachliche Regeln gehören in Services, Policies oder Hooks.
- Jede neue Funktion erhält Tests.
- Strukturtests ersetzen keine Verhaltenstests, sichern aber die Refaktorierungsgrenzen ab.
- Nicht implementierte Funktionen werden nicht als vorhandene Features dokumentiert.


## Stand 0.4.57

Gebündelte Verhaltens- und Funktionstests können mit `npm run test:behavior-suite` ausgeführt werden.
