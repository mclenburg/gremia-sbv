# Roadmap Gremia.SBV

Stand: **0.9.1**  
Status: Vor-1.0-Ergänzung. `0.9.1` ergänzt das im RC aufgefallene Personenverzeichnis und den Datenschutz-Lifecycle; danach gilt Feature-Freeze bis 1.0.

## Aktueller Stand

Gremia.SBV ist eine lokale, offline-first Electron-/React-/Node.js-App für vertrauliche SBV-Fallarbeit. Der Schwerpunkt liegt auf Security, Datenschutz, Accessibility, Wartbarkeit und Release-Readiness.

Abgeschlossen beziehungsweise im 0.9.1-Stand enthalten sind:

- verschlüsselte lokale Fallaktenarbeit,
- Personenverzeichnis für schwerbehinderte und gleichgestellte Beschäftigte,
- BEM-, Präventions-, Beteiligungs-, Kündigungs-, Gleichstellungs-/GdB- und Arbeitsplatzgestaltungsprozesse,
- Fristen und Wiedervorlagen inklusive iCal-Export,
- Vorlagen, Dokumente, Reports und Compliance-Dokumente,
- Audit-Hash-Chain ohne Direktidentifikatoren als Zielzustand,
- Auto-Lock, Backup/Restore und Export-Guards,
- strukturelle Entkernung von `workflowViews.tsx`,
- lebende Protokollverknüpfungen für `/bem`, `/praev`, `/bet`, `/kuend`, `/gleich`, `/anp` und `/fr`,
- GitHub-Release-Build für Linux, Windows und unsigniertes macOS.

## Vor RC1 offen

Keine offenen Fachfeatures im Sinne neuer Großmodule. Vor 1.0 sind nur noch releasekritische Korrekturen zulässig:

- Personenbindung der Fallakte sauber migrieren,
- anonyme Beratungsanfrage ohne Direktidentifikatoren absichern,
- Audit-Log ohne Direktidentifikatoren härten,
- Compliance Center auf Personenverzeichnis, DSFA/TOM/VVT und Art. 15 vorbereiten,
- bestehende Tests von veralteten Strukturannahmen bereinigen.

## RC1-Status

### 0.9.1 – Vor-1.0-Ergänzung

- Personenverzeichnis, Import-Assistent, Statusablaufwarnungen und Datenschutz-Lifecycle werden vor 1.0 ergänzt, weil sie im RC als fehlender Grundbaustein auffielen.
- Kein GdB-Standardfeld, keine Diagnosen.
- Personalnummer optional.
- Freie Fallakten ohne Person werden perspektivisch durch Personenauswahl oder anonyme Anfrage ersetzt.

## Nach RC1

- Fehlerkorrekturen aus Test, Review und Pilotnutzung.
- Dokumentationskorrekturen ohne Funktionsausweitung.
- Security-Fixes und Datenverlust-/Migrationsfixes.
- Stabilisierung von Barrierefreiheit, Responsivität und Cross-Platform-Builds.

## Später / 1.x

- Vollständiger Art.-15-Auskunftsexport.
- Erweiterte Auswertungen nur datensparsam und ohne technische UUIDs in Reports.
- Weitere technische Modularisierung großer Services und Inlinecommand-Module.
- Keine Cloud-, Sync- oder Mehrbenutzerfunktionen ohne neue Architektur- und Datenschutzentscheidung.

## Historisch abgeschlossen

### 0.2 Prozessfundament: historisch abgeschlossen

- Frühere Prozessfundament-Aufgaben sind historisch abgeschlossen und werden nicht mehr als offene Checkliste geführt.

### 0.3 Fristen und Wiedervorlagen: historisch abgeschlossen

- Frühere Fristen- und Wiedervorlagen-Aufgaben sind historisch abgeschlossen und werden nicht mehr als offene Checkliste geführt.

### 0.8.11 – `workflowViews.tsx` vollständig entkernen

- `workflowViews.tsx` ist nur noch Import-/Re-Export-Orchestrierung.
- Die Fallaktenansicht liegt unter `src/app/features/cases/`.

### 0.8.12 – Lebende Protokollverknüpfungen

- Die lebenden Protokollverknüpfungen als MVP in 0.8.12 haben das generische Fundament für persistente Aktenbezüge gelegt.

### 0.8.13 – RC-Härtung

- In 0.8.13 wurde die RC-kritische Linkabdeckung auf `/bem`, `/praev`, `/bet`, `/kuend`, `/gleich`, `/anp` und `/fr` vervollständigt.

### 0.9.0-rc.1-p – RC-Coverage-Scope und Service-Behavior-Tests

- Zusätzliche verhaltensprüfende Tests für Tätigkeitsbericht, Prozessfähigkeiten, Gleichstellung/GdB-Guidance und Kündigungs-Privacy ergänzt.

### 0.9.0-rc.1-p – erster Release Candidate

- Version, Changelog, Known Issues, Release Notes und Release-Checkliste auf den RC-Stand gezogen.
- Release-Artefakte auf `.exe`, `.AppImage` und `.dmg` begrenzt.

## RC-Freeze-Regel 0.9.1

Nach Abschluss der 0.9.1-Korrekturen gilt: keine neuen Fachfeatures, keine Cloud-Synchronisation, keine Lizenzänderung weg von AGPL-3.0-or-later. Zulässig bleiben Security-Fixes, Datenverlust-/Migrationsfixes, Buildfixes, Testfixes, Dokumentationskorrekturen und offensichtliche UI-Bugs ohne neue Fachlogik.
