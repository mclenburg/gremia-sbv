# Patch 0.8.6-c – Maßnahmenbezogene Fristen, Dokumente und Vorlagen

## Ziel

Dieser Patch verbindet Fallmaßnahmen enger mit den übrigen Aktenbestandteilen. Fristen und Dokumente können jetzt optional direkt einer Maßnahme zugeordnet werden. Damit bleibt die Fallakte führend, während einzelne Vorgänge wie SBV-Beteiligung oder Arbeitsplatzgestaltung ihre eigenen Fristen und Unterlagen sauber bündeln können.

## Datenmodell

Neu ergänzt:

- `deadlines.measure_id`
- `case_documents.measure_id`

Neue Indizes:

- `idx_deadlines_measure_id`
- `idx_deadlines_case_measure`
- `idx_case_documents_measure_id`
- `idx_case_documents_case_measure`

Die Spalten sind optional, damit bestehende Akten ohne Datenverlust weiter funktionieren.

## Verhalten

- Dokumente bleiben immer an eine Fallakte gebunden.
- Wenn beim Import eine aktive Fallmaßnahme ausgewählt ist, wird das Dokument zusätzlich dieser Maßnahme zugeordnet.
- Fristen können über `CreateDeadlineInput.measureId` direkt an eine Fallmaßnahme gebunden werden.
- Die Fristenübersicht zeigt neben dem Fall nun auch die zugehörige Maßnahme an.
- Die Dokumentendetailansicht zeigt die zugeordnete Maßnahme, sofern vorhanden.

## Vorlagenkontext

`TemplateListFilters` unterstützt jetzt `measureType`. Die Vorlagensuche kann damit maßnahmentypbezogen priorisieren, ohne neue personenbezogene Daten zu erzeugen.

## Datenschutz

Die Maßnahmezuordnung verbessert die Zweckbindung und Nachvollziehbarkeit, weil Fristen und Dokumente nicht nur allgemein im Fall liegen, sondern dem konkreten fachlichen Vorgang zugeordnet werden können. Audit-Logs bleiben sparsam und enthalten keine vertraulichen Freitexte.
