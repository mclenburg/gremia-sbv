# Patch 0.8.8-a – Fallakten-Layout beruhigen

## Ziel

Die Fallakte sollte im Arbeitsbereich ruhiger und strukturierter wirken, insbesondere im Aktionsbereich am unteren Rand des Detailpanels.

## Änderungen

- `CaseWorkbenchFooter` wurde neu gegliedert.
- Die Aktionen sind jetzt in zwei Gruppen aufgeteilt:
  - **Schnellerfassung**: Notiz / Protokoll, Dokument, Frist
  - **Maßnahmen**: Prävention, BEM, Beteiligung, Arbeitsplatz, Kündigung, Gleichstellung
- Die drei Kernaktionen bleiben prominent als Primäraktionen.
- Maßnahmeaktionen werden als ruhigere Sekundäraktionen dargestellt.
- Jede Aktion erhält zusätzlich eine kurze Funktionsbeschreibung direkt im Button.
- Neue Footer-Styles wurden zentral in `src/app/caseWorkbench.css` ergänzt.
- Keine Schemaänderung.

## Nutzen

- weniger optische Unruhe,
- klarere Priorisierung,
- bessere Scanbarkeit,
- konsistenterer Arbeitsfluss in der Fallakte.
