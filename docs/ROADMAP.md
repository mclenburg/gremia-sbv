# Roadmap Gremia.SBV

Stand: **0.8.11-b**  
Zielrichtung: stabiler Weg zu `0.9.0-rc.1` ohne neue Nebenideen außerhalb des aktualisierten Entwicklerkonzepts.

## Aktueller Stand

Gremia.SBV ist eine lokale, offline-first Electron-/React-/Node.js-App für vertrauliche SBV-Fallarbeit. Der aktuelle Schwerpunkt liegt nicht mehr auf neuen Großmodulen, sondern auf Security, Datenschutz, Accessibility, Wartbarkeit und Release-Readiness.

Abgeschlossen sind unter anderem:

- verschlüsselte lokale Fallaktenarbeit,
- BEM-, Präventions-, Beteiligungs-, Kündigungs-, Gleichstellungs-/GdB- und Arbeitsplatzgestaltungsprozesse,
- Fristen und Wiedervorlagen,
- Vorlagen, Dokumente, Reports und Compliance-Dokumente,
- Audit-Hash-Chain, Auto-Lock, Backup/Restore und Export-Guards,
- Security-Hardening 0.8.9 mit Unlock-Delay und aktuellem Backup-KDF,
- Review-Fixes 0.8.10 für Accessibility, Pflichtverstoß-UX und Roadmap,
- strukturelle Entkernung von `workflowViews.tsx` in 0.8.11.

## Vor RC1 offen

### 0.8.12 – Lebende Protokollverknüpfungen als MVP

- MVP nur für `/bem`, `/bet` und `/fr`.
- Persistente Linkmetadaten über `case_note_links`.
- Bestehende Notizen ohne Links bleiben normaler Text.
- Export/Reports mit fachlichen Labels, aber ohne technische UUIDs.
- Fehlende Zielobjekte robust als deaktivierte Aktenverweise darstellen.

### 0.8.13 – RC-Härtung

- Build-/Test-/E2E-Matrix finalisieren.
- Migrationstest für bestehende 0.8.x-Datenbanken ergänzen.
- E2E-Selektoren an RC-kritischen Navigationspunkten stabilisieren.
- Security-/Datenschutz-Readiness prüfen.
- README, BUILD, E2E_TESTS, RELEASE_CHECKLIST, SECURITY, ROADMAP und CHANGELOG finalisieren.

### 0.9.0-rc.1 – Release Candidate

- Versionssprung auf `0.9.0-rc.1`.
- Keine neuen Features.
- Keine größeren Refactorings.
- Freeze-Regel dokumentieren: Nach RC1 nur Bugfixes, Buildfixes, Security-Fixes, Datenverlust-Fixes und Dokumentationskorrekturen.

## Nach RC1

- Fehlerkorrekturen aus Test, Review und Pilotnutzung.
- Dokumentationskorrekturen ohne Funktionsausweitung.
- Sicherheits- und Datenverlust-Fixes mit Hotfix-Versionen.

## Später / 1.x

- Erweiterung der lebenden Protokollverknüpfungen auf weitere Kurzbefehle erst nach stabiler MVP-Erfahrung.
- Weitere Auswertungen nur datensparsam und ohne technische UUIDs in Reports.
- Keine Cloud-, Sync- oder Mehrbenutzerfunktionen.

## Historisch abgeschlossen

### 0.8.11 – `workflowViews.tsx` vollständig entkernen
- 0.8.11-a – Clean-Code-Hotfix: CasesView in fokussierte Module aufteilen und obsolete Strukturtests bereinigen

- `workflowViews.tsx` ist nur noch Import-/Re-Export-Orchestrierung.
- Die Fallaktenansicht liegt unter `src/app/features/cases/`.
- Es gab keine Schemaänderung und keine neue fachliche UI-Logik.

Frühere Planpunkte aus 0.2 und 0.3 sind nicht mehr als offene Checkliste zu führen. Sie sind entweder umgesetzt, durch spätere Architekturentscheidungen ersetzt oder in die RC-Roadmap oben überführt.

- 0.2 Prozessfundament: historisch abgeschlossen oder in spätere Prozessmodule überführt.
- 0.3 Fristen und Wiedervorlagen: historisch abgeschlossen oder durch heutige Fristen-/Dashboard-Architektur ersetzt.
- 0.3.16 Fallnotizen und Volltextsuche: historisch abgeschlossen.
