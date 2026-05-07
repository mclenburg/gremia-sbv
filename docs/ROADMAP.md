# Roadmap Gremia.SBV

Stand: **0.8.13-o**  
Zielrichtung: stabiler Weg zu `0.9.0-rc.1` ohne neue Nebenideen außerhalb des aktualisierten Entwicklerkonzepts.

## Aktueller Stand

Gremia.SBV ist eine lokale, offline-first Electron-/React-/Node.js-App für vertrauliche SBV-Fallarbeit. Der aktuelle Schwerpunkt liegt nicht mehr auf neuen Großmodulen, sondern auf Security, Datenschutz, Accessibility, Wartbarkeit und Release-Readiness.

Abgeschlossen sind unter anderem:

- verschlüsselte lokale Fallaktenarbeit,
- BEM-, Präventions-, Beteiligungs-, Kündigungs-, Gleichstellungs-/GdB- und Arbeitsplatzgestaltungsprozesse,
- Fristen und Wiedervorlagen,
- Vorlagen, Dokumente, Reports und Compliance-Dokumente,
- Audit-Hash-Chain, Auto-Lock, Backup/Restore und Export-Guards,
- Security-Hardening mit Unlock-Delay und aktuellem Backup-KDF,
- strukturelle Entkernung von `workflowViews.tsx`,
- Dashboard- und Settings-Module außerhalb des Fallaktenbereichs,
- lebende Protokollverknüpfungen für die RC-kritischen Fallaktenbefehle `/bem`, `/praev`, `/bet`, `/kuend`, `/gleich`, `/anp` und `/fr`,
- Service-Coverage-Gate mit V8-Provider und 70-Prozent-Schwellen,
- GitHub-Release-Build für Linux, Windows und unsigniertes macOS.

## Vor RC1 offen

### 0.9.0-rc.1 – Release Candidate

- Versionssprung auf `0.9.0-rc.1`.
- Keine neuen Features.
- Keine größeren Refactorings.
- Release Notes finalisieren.
- Known Issues finalisieren.
- Freeze-Regel dokumentieren: Nach RC1 nur Bugfixes, Buildfixes, Security-Fixes, Datenverlust-/Migrationsfixes und Dokumentationskorrekturen.

## Nach RC1

- Fehlerkorrekturen aus Test, Review und Pilotnutzung.
- Dokumentationskorrekturen ohne Funktionsausweitung.
- Sicherheits- und Datenverlust-Fixes mit Hotfix-Versionen.

## Später / 1.x

- Weitere Auswertungen nur datensparsam und ohne technische UUIDs in Reports.
- Weitere technische Modularisierung großer Services und Inlinecommand-Module.
- Keine Cloud-, Sync- oder Mehrbenutzerfunktionen.

## Historisch abgeschlossen


### 0.2 Prozessfundament: historisch abgeschlossen

- Frühere Prozessfundament-Aufgaben sind historisch abgeschlossen und werden nicht mehr als offene Checkliste geführt.

### 0.3 Fristen und Wiedervorlagen: historisch abgeschlossen

- Frühere Fristen- und Wiedervorlagen-Aufgaben sind historisch abgeschlossen und werden nicht mehr als offene Checkliste geführt.

### 0.8.11 – `workflowViews.tsx` vollständig entkernen

- `workflowViews.tsx` ist nur noch Import-/Re-Export-Orchestrierung.
- Die Fallaktenansicht liegt unter `src/app/features/cases/`.
- Es gab keine Schemaänderung und keine neue fachliche UI-Logik.

### 0.8.12 – Lebende Protokollverknüpfungen

- Die lebenden Protokollverknüpfungen als MVP in 0.8.12 haben das generische Fundament für persistente Aktenbezüge gelegt.
- Persistente Linkmetadaten liegen in `case_note_links`.
- Bestehende Notizen ohne Links bleiben normaler Text.
- Notizlinks nutzen fachliche Labels; technische Ziel-IDs bleiben interne Routingdaten.
- Fehlende Zielobjekte werden deaktiviert angezeigt.
- In 0.8.13 wurde die RC-kritische Linkabdeckung auf `/bem`, `/praev`, `/bet`, `/kuend`, `/gleich`, `/anp` und `/fr` vervollständigt.

### 0.8.13 – RC-Härtung

- Build-/Test-/E2E-Matrix finalisiert.
- Migrations-Smoke, Security-/Datenschutz-Readiness, responsive E2E-Readiness und Accessibility-Readiness ergänzt.
- README als öffentliche Projektstartseite für SBVen überarbeitet.
- Sicherheitsdokumentation von Frühphasen-Placeholdern bereinigt.
- Service-Coverage-Gate mit V8-Provider und 70-Prozent-Schwellen ergänzt.
- Echte Behavior-Tests für sicherheits- und rechtskritische Services ergänzt.
- GitHub-Release-Build für Linux, Windows und unsigniertes macOS ergänzt.

Frühere Planpunkte aus 0.2 und 0.3 sind nicht mehr als offene Checkliste zu führen. Sie sind entweder umgesetzt, durch spätere Architekturentscheidungen ersetzt oder in die RC-Roadmap oben überführt.


### 0.8.13-o – RC-Coverage-Scope und Service-Behavior-Tests

- V8-Coverage-Gate auf RC-kritische, unit-testbare Service-Verträge begrenzt.
- Zusätzliche verhaltensprüfende Tests für Tätigkeitsbericht, Prozessfähigkeiten, Gleichstellung/GdB-Guidance und Kündigungs-Privacy ergänzt.
- Breite datenbankgebundene Adapterservices bleiben Post-RC-Thema für modulare Refactorings und Integrationstests.
