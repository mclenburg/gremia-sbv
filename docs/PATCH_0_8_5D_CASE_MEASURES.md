# Patch 0.8.5-d – Fallaktenzentrierte Maßnahmenarchitektur

Dieser Patch ist der erste Schritt zur konsequenten Aktenlogik: personenbezogene fachliche SBV-Arbeit wird in der Fallakte angelegt und fortgeschrieben.

## Leitentscheidung

Die Fallakte führt. Fachmodule außerhalb der Fallakte sind Cockpits, Auswertungen oder Berichte. Neue SBV-Beteiligungen werden deshalb nicht mehr im Beteiligungsmonitor angelegt, sondern in der geöffneten Fallakte als Maßnahme.

## Technische Bausteine

- Neue zentrale Tabelle `case_measures`.
- Neue Detailtabelle `case_measure_participation`.
- Migration `0020_case_measures.sql` übernimmt bestehende `sbv_participations` als Maßnahmen vom Typ `sbv_participation`.
- Neuer Service `CaseMeasureService` als gemeinsame Klammer für künftige Maßnahmentypen.
- Beteiligungsservice schreibt und liest ab jetzt über `case_measures` + `case_measure_participation`.

## UI-Änderungen

- Fallbaum zeigt SBV-Beteiligungen im Abschnitt „Maßnahmen“.
- Footer der Fallakte bietet „Beteiligung“ als neue Maßnahme.
- `ParticipationProcessDetail` bearbeitet Beteiligungen innerhalb der Fallakte.
- Der bisherige Beteiligungsmonitor ist jetzt ein Cockpit. Er zeigt übergreifend offene Vorgänge, führt aber zur Fallakte zurück.

## Noch bewusst offen

- Das Inline-Command-Overlay wird im nächsten Schritt zentralisiert.
- Arbeitsplatzgestaltung nach § 164 Abs. 4 SGB IX wird als eigener Maßnahmentyp danach ergänzt.
- Fristen und Dokumente bleiben vorerst über bestehende Prozess-IDs verknüpft und werden in einem Folgepatch enger an `measure_id` gebunden.
