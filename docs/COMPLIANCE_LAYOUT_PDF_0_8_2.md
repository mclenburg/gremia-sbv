# Gremia.SBV 0.8.2 – Compliance Layout und PDF-Export

## Ziel

Das Compliance Center wurde auf ein breites, nutzbares Layout umgestellt und erhält zusätzlich zum Markdown-Export eine PDF-Ausgabe.

## Layout

- Dokumentkarten liegen nun responsiv oben in einem Kartenraster.
- Das DSGVO-Auskunftsformular steht als eigener breiter Bereich darunter.
- Die Dokumentvorschau ist breit und nicht mehr in eine schmale Spalte gedrückt.
- Die Vorschau verwendet `pre-wrap`, damit lange Zeilen nicht seitlich auslaufen.

## PDF-Export

Der Button `PDF exportieren` öffnet eine druckoptimierte PDF-Ansicht.

Ablauf:

1. Dokument in druckoptimiertes HTML umwandeln.
2. Neue Druckansicht öffnen.
3. Dort `Als PDF drucken / speichern` verwenden.

Damit bleibt die Funktion offline-fähig und benötigt keinen externen PDF-Dienst.
