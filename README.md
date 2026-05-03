# Gremia.SBV

Gremia.SBV ist eine lokale, verschlüsselte Desktop-Anwendung für die vertrauliche Fallarbeit der Schwerbehindertenvertretung. Die App unterstützt SBV-Arbeit bei Fällen, Gesprächsnotizen, Fristen, Präventions- und BEM-Prozessen, Kontakten, Vorlagen, Wissensarbeit und anonymisierten Tätigkeitsberichten.

Die Anwendung ist bewusst **offline-first** angelegt: keine Cloud-Synchronisierung, keine Telemetrie und kein externer Login-Dienst. SBV-Daten verbleiben lokal und werden verschlüsselt gespeichert.

## Aktueller Stand: Version 0.4.42

Version 0.4.42 ist ein Clean-Code- und Stabilisierungsstand:

- `src/app/App.tsx` wurde auf die App-Shell reduziert: Authentifizierung, globale Provider, Navigation, Datenladen und View-Routing.
- Die großen Fachansichten wurden aus der Shell in `src/app/workflowViews.tsx` ausgelagert.
- Der Provider-Wrapping-Fehler aus 0.4.38 ist korrigiert und per Regressionstest abgesichert.
- Nicht mehr benötigte Paketartefakte wurden aus dem Repository entfernt.
- Diese README wurde bereinigt und auf den aktuellen Entwicklungsstand gebracht.

## Zielbild

Gremia.SBV ist keine Kopie von Gremia.BR. Während Gremia.BR sitzungs-, gremien- und beschlussorientiert arbeitet, ist Gremia.SBV fall-, fristen- und vertraulichkeitszentriert.

```text
Gremia.SBV = vertrauliche, fristensichere, datensparsame SBV-Fallarbeit
```

## Grundprinzipien

- **Offline-first:** keine Cloud, kein externer Login, keine Telemetrie.
- **Lokal verschlüsselt:** SQLCipher-kompatible SQLite-Datenbank.
- **Datensparsam:** anonyme, pseudonyme und personenbezogene Fallführung möglich.
- **Fristensicher:** Wiedervorlagen, Ampellogik, Dashboard-Warnungen und iCal-Export.
- **SBV-zentriert:** Prävention, Beteiligung, Arbeitsplatzsicherung und vertrauliche Fallbegleitung stehen im Mittelpunkt.
- **Kein gemeinsames BR-/Arbeitgeber-Fallaktensystem:** Exporte und Weitergaben erfolgen nur bewusst, fallbezogen und nachvollziehbar.

## Hauptmodule

### Dashboard

- offene Fälle
- kritische Fristen und Wiedervorlagen
- BEM- und Präventionsvorgänge
- Prozess- und Datenschutzwarnungen

### Fallverwaltung

- Fallakten pro Person oder anonym/pseudonym
- Kategorien wie BEM, Prävention, Gleichstellung, Kündigungsanhörung, Nachteilsausgleich, Diskriminierung und Arbeitsplatzgestaltung
- Gesprächsnotizen und Protokolle
- Dokumentenzuordnung
- Rechtsgrundlagen- und Kontaktverknüpfungen
- kontextbezogene Textbefehle für Fallverweise, Fristen, Risiken, Vertraulichkeit und Anonymisierung

### Fristenkalender

- Wiedervorlagen
- Arbeitgeberantworten
- Kündigungs-/Anhörungsfristen
- BEM-Rückmeldungen
- Gleichstellungs-/Widerspruchsfristen
- Dashboard-Regel: offene kritische Fristen werden rechtzeitig sichtbar
- iCal-Export

### Präventionsverfahren nach § 167 Abs. 1 SGB IX

- fallbezogener Prozess
- Statusmodell mit Warnlogik
- Arbeitgeberreaktion, Maßnahmenklärung, Ergebnisdokumentation
- Deep-Links in die Fallakte
- Vorlagenanbindung

### BEM / weitere Prozessmodule

- BEM als eigenständiger Prozessbereich vorbereitet
- Gleichstellungsanträge
- Kündigungsanhörungen
- Dokumentenmanagement
- späterer Tätigkeitsbericht

### Kontakte / Netzwerk

- Inklusionsamt
- Agentur für Arbeit
- Betriebsarzt
- Integrationsfachdienst
- externe Beratungsstellen
- anwaltliche Kontakte
- interne Ansprechpartner

### Wissensdatenbank

- Normen, Kommentierungen, Rechtsprechung und Checklisten
- Verknüpfung mit Fällen
- Arbeitsnotizen für SBV-Praxis

### Vorlagen und Schriftverkehr

- Vorlagenverwaltung mit Platzhaltern
- kontextbezogene Vorlagen aus Fall- und Prozessdaten
- PDF-/DOCX-nahe Exportlogik
- Warnungen bei fehlenden oder sensiblen Platzhaltern

### Tätigkeitsbericht

- anonymisierte Fallstatistik
- Jahresbericht nach SBV-Praxisbedarf
- Datenschutzprüfung vor Export

## Technik

| Bereich | Technik |
|---|---|
| Desktop-Shell | Electron |
| Renderer | React + TypeScript |
| Styling | Tailwind CSS + modulare CSS-Dateien |
| Build | Vite |
| lokale Datenbank | SQLite mit SQLCipher-kompatibler Verschlüsselung |
| nativer DB-Adapter | `better-sqlite3-multiple-ciphers` |
| Exporte | DOCX, PDF-/Druckpfade, iCal |
| Tests | Vitest |

## Projektstruktur

```text
gremia-sbv/
├── electron/                  # Electron Main/Preload und IPC
│   ├── main.ts
│   ├── preload.ts
│   └── ipc/
├── src/
│   ├── main.tsx               # Renderer-Einstieg
│   ├── app/
│   │   ├── App.tsx            # schlanke App-Shell
│   │   ├── workflowViews.tsx  # ausgelagerte Fachansichten
│   │   ├── core/              # Modelle, Navigation, Hooks
│   │   ├── features/          # fachliche UI-Bausteine
│   │   ├── shared/            # wiederverwendbare UI-/Dialog-/A11y-Komponenten
│   │   └── shell/             # Navigation/Shell
│   └── styles/
├── services/                  # Fachliche Services im Main-Prozess
├── database/                  # Schema, Migrationen, Seeds
├── scripts/                   # Build-, DB- und Diagnose-Skripte
├── docs/                      # Architektur, Datenschutz, Sicherheit, Release-Notizen
└── tests/                     # Policy-, Regression- und Servicetests
```

## Entwicklung

### Voraussetzungen

- Node.js LTS
- npm
- Linux-Build: native Build-Abhängigkeiten für Electron und SQLCipher-Adapter

### Installation

```bash
npm install
```

Native Electron-Abhängigkeiten bei Bedarf neu bauen:

```bash
npm run native:rebuild
```

### Entwicklung starten

```bash
npm run dev
```

### Tests

```bash
npm run test
```

Wichtige gezielte Testläufe:

```bash
npm run test:provider-wrapping
npm run test:maintainability
npm run test:privacy
npm run test:backup
npm run test:migrations
npm run test:prevention
npm run test:templates
npm run test:knowledge
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

## Sicherheit und Datenschutz

Gremia.SBV behandelt Fallinformationen grundsätzlich als vertrauliche SBV-Daten. Gesundheitsdaten, personenbezogene Angaben und arbeitsrechtliche Konfliktdaten werden nur lokal verarbeitet. Export, Weitergabe und Deanonymisierung müssen bewusst ausgelöst und fachlich begründet werden.

Wichtige Dokumente:

- `docs/SECURITY.md`
- `docs/DATENSCHUTZKONZEPT.md`
- `docs/DATABASE_ENCRYPTION.md`
- `docs/BACKUP_RESTORE.md`
- `docs/RETENTION_AND_TESTS.md`
- `docs/GREMIA_BR_INTERFACE.md`

## Gremia.BR-Schnittstelle

Eine spätere Verbindung zu Gremia.BR bleibt höchstens **lesend**. Sie darf nicht dazu führen, dass Gremia.SBV zu einem gemeinsamen Fallakten-System mit dem Betriebsrat wird. Personenbezogene SBV-Falldaten werden nicht automatisch an Gremia.BR übertragen.

Siehe `services/gremiaBrReadAdapter.ts` und `docs/GREMIA_BR_INTERFACE.md`.

## Clean-Code-Leitlinie ab 0.4.42

- `App.tsx` bleibt Shell und Orchestrierung, nicht Fachlogik-Sammelstelle.
- Fachliche UI-Logik wird in Features oder ausgelagerte View-Module verschoben.
- Wiederverwendbare UI-Bausteine gehören nach `src/app/shared/`.
- Fachliche Regeln gehören in `services/*Policy.ts` oder dedizierte Service-Module.
- Jede neue fachliche Funktion erhält mindestens einen Policy-, Service- oder Regressionstest.
- Temporäre Build-Artefakte und verschachtelte ZIP-Dateien gehören nicht ins Repository.


## Architekturstand 0.4.42 – Workflow-Module

Die erste Clean-Code-Refaktorierung wurde weitergeführt. `App.tsx` bleibt die App-Shell. Die bisherige Sammeldatei `workflowViews.tsx` wurde weiter entschärft:

- `KnowledgeView` liegt jetzt in `src/app/features/knowledge/KnowledgeView.tsx`.
- Die Präventionsübersicht liegt jetzt in `src/app/features/prevention/PreventionView.tsx`.
- Gemeinsame Präventionslabels und Statusreihenfolgen liegen in `src/app/features/prevention/preventionShared.ts`.
- `workflowViews.tsx` enthält noch die großen Altbereiche, wird aber ab 0.4.42 schrittweise weiter zerlegt.

Nächster sinnvoller Schnitt: `TemplatesView` und danach `CasesView` in eigene Feature-Dateien und Unterkomponenten auslagern.
