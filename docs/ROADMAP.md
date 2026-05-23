# Roadmap Gremia.SBV

Stand: **0.9.2**  
Status: Vor-1.0-Stabilisierung. `0.9.2` enthält die RC-Ergänzungen aus `0.9.1`, die Dashboard-/Settings-Härtung, die optionale Gremia.BR-Lesebrücke und den vorbefüllbaren und exportierbaren Art.-15-Arbeitsentwurf im Compliance Center. Bis 1.0 gilt Feature-Freeze; zulässig bleiben nur Security-, Datenverlust-, Migrations-, Test-, Dokumentations- und offensichtliche UI-Fixes.

## Aktueller Stand

Gremia.SBV ist eine lokale, offline-first Electron-/React-/Node.js-App für vertrauliche SBV-Fallarbeit. Der Schwerpunkt liegt auf Security, Datenschutz, Accessibility, Wartbarkeit und Release-Readiness.

Abgeschlossen beziehungsweise im 0.9.2-Stand enthalten sind:

- verschlüsselte lokale Fallaktenarbeit auf SQLCipher-Basis,
- Personenverzeichnis für schwerbehinderte und gleichgestellte Beschäftigte,
- anonyme Beratungsanfrage ohne Direktidentifikatoren,
- BEM-, Präventions-, Beteiligungs-, Kündigungs-, Gleichstellungs-/GdB- und Arbeitsplatzgestaltungsprozesse,
- Fristen und Wiedervorlagen inklusive datensparsamer iCal-Exporte,
- Vorlagen, Dokumente, Reports und Compliance-Dokumente,
- Compliance Center mit TOMs, VVT-Entwurf, DSFA-Entwurf, Lösch-/Aufbewahrungskonzept, Betroffenenrechte-Prozess sowie vorbefüllbarer und exportierbarer Antwort auf Art.-15-Auskunftsersuchen,
- Audit-Hash-Chain ohne Direktidentifikatoren als Zielzustand,
- Auto-Lock, Backup/Restore und Export-Guards,
- strukturelle Entkernung von `workflowViews.tsx`,
- lebende Protokollverknüpfungen für `/bem`, `/praev`, `/bet`, `/kuend`, `/gleich`, `/anp` und `/fr`,
- optionale Gremia.BR-Lesebrücke nur nach ausdrücklicher Nutzeraktion, ohne Hintergrundsynchronisation und ohne Rückschreiben,
- GitHub-Release-Build für Linux, Windows und unsigniertes macOS.

## Vor RC1 offen

Keine offenen Fachfeatures im Sinne neuer Großmodule. Vor 1.0 sind nur noch releasekritische Korrekturen zulässig:

- Migration und Altfallpfade für Personenbindung der Fallakte final gegen Echtdaten-Szenarien prüfen,
- anonyme Beratungsanfrage ohne Direktidentifikatoren in Pilotnutzung validieren,
- Audit-Log ohne Direktidentifikatoren und Hash-Kette in Import-, Export- und Lesebrückenpfaden weiter härten,
- Art.-15-Auskunftsexport organisatorisch flankieren: Identitätsprüfung, Drittdaten-/Schwärzungsprozess und Freigabeweg müssen außerhalb der App verbindlich geregelt werden,
- bestehende Tests von veralteten Strukturannahmen bereinigen,
- Dashboard, Einstellungen und Compliance Center visuell im harten Industrial-Design stabilisieren.

## RC1-Status

### 0.9.1 – Vor-1.0-Ergänzung

- Personenverzeichnis, Import-Assistent, Statusablaufwarnungen und Datenschutz-Lifecycle wurden vor 1.0 ergänzt, weil sie im RC als fehlender Grundbaustein auffielen.
- Kein GdB-Standardfeld, keine Diagnosen.
- Personalnummer optional.
- Freie Fallakten werden über Personenauswahl oder den anonymen Sonderweg geführt.

### 0.9.2 – Stabilisierung und Review-Fixes

- Dashboard und Einstellungen wurden auf die bestehende Industrial-Gestaltung zurückgeführt.
- Gremia.BR bleibt eine optionale, explizit ausgelöste Lesebrücke ohne Hintergrundverbindung.
- Gremia.BR-HTTP-Leseabfragen werden auditierbar, ohne Inhalte, Query-Werte, Token oder Passwörter zu protokollieren.
- `password_secret` nutzt bei neuen Werten den ehrlichen Präfix `b64:v1:`; Legacy-`vault:v1:` bleibt lesbar.
- Der Art.-15-Arbeitsentwurf im Compliance Center ist aus Personen-, Fallakten-, Fristen-, Maßnahmen-, Import- und Lifecycle-Daten vorbefüllbar sowie als Markdown/PDF exportierbar. Er ersetzt keine rechtliche Prüfung, keine Identitätsprüfung und keine Schwärzung von Drittdaten.

## Nach RC1

- Fehlerkorrekturen aus Test, Review und Pilotnutzung.
- Dokumentationskorrekturen ohne Funktionsausweitung.
- Security-Fixes und Datenverlust-/Migrationsfixes.
- Stabilisierung von Barrierefreiheit, Responsivität und Cross-Platform-Builds.

## Später / 1.x

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

### 0.9.0 – RC-Stabilisierung historisch gebündelt

- RC-Coverage-Scope, Service-Behavior-Tests, Release-Artefakte und Build-Dokumentation wurden in der 0.9.0-RC-Linie stabilisiert.
- Die Detailnotizen einzelner RC-Zwischenpatches werden nicht mehr als aktuelle Roadmap geführt. Maßgeblich für 0.9.2 sind README, Roadmap, Build-Dokumentation und die aktuellen Test-Gates.

## Step G – Test-/Doku-/Release-Sync

- README, Roadmap und Build-/Release-Dokumentation sind auf 0.9.2 synchronisiert.
- Alte RC-Notes, Release Notes und Change Logs werden vor Veröffentlichung nicht als aktive Dokumente geführt.
- Tests sollen plattformunabhängig sein und Fachlogik bevorzugt über Behavior-Tests statt reine Stringvergleiche absichern.

## RC-Freeze-Regel 0.9.2

Nach Abschluss der 0.9.2-Korrekturen gilt: keine neuen Fachfeatures, keine Cloud-Synchronisation, keine Lizenzänderung weg von AGPL-3.0-or-later. Zulässig bleiben Security-Fixes, Datenverlust-/Migrationsfixes, Buildfixes, Testfixes, Dokumentationskorrekturen und offensichtliche UI-Bugs ohne neue Fachlogik.
