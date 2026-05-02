# Fallnotizen, Gesprächsprotokolle und Volltextsuche

Stand: 0.3.16

## Fachliche Zielsetzung

Die Fallakte ist nicht nur ein Stammdatensatz. Sie muss den tatsächlichen Arbeitsverlauf der SBV dokumentieren:

- Gesprächsnotizen
- Gesprächsprotokolle
- Telefonate / Videocalls
- E-Mail-Zusammenfassungen
- BEM- und Anhörungsnotizen
- interne Einordnung und nächste Schritte

Jede Notiz hängt zwingend an einer Fallakte. Damit bleibt die Dokumentation fallbezogen, nachvollziehbar und datensparsam.

## Volltextsuche

Die Suche läuft über zwei Indexbereiche:

1. `case_notes_fts` für Gesprächsnotizen und Protokolle
2. `case_documents_fts` für den Dokumentenindex

Das Dokumentenmanagement schreibt später extrahierte Dokumenteninhalte in `case_documents.extracted_text` und aktualisiert danach `case_documents_fts`. Bis dahin sind Dokumente über Dateiname und optionalen Anzeigenamen suchbar.

## Datenschutz

Notizen können als gesundheitsbezogen markiert werden. Das ist bewusst sichtbar, damit bei Export, Bericht und Weitergabe später streng getrennt werden kann.

Vertraulichkeitsstufen:

- `normal`
- `sensibel`
- `hoch_sensibel`

## Bedienung

Im Modul **Fallakte**:

1. Fallakte links auswählen.
2. Protokoll-/Notizdaten erfassen.
3. Speichern.
4. Volltextsuche über alle Fallakten oder nur die aktive Fallakte ausführen.

Dashboard-Kacheln enthalten ab 0.3.16 keinen zusätzlichen Text „Öffnen“ mehr. Die Kachel selbst ist die Aktion.
