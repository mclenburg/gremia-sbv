# Gremia.SBV 0.4.44 – TemplatesView extrahieren

## Ziel

Die Vorlagenverwaltung wird aus der Übergangsdatei `workflowViews.tsx` herausgelöst und als eigenes Feature-Modul geführt.

## Änderungen

- `src/app/features/templates/TemplatesView.tsx` neu
- `TemplatesView` aus `src/app/workflowViews.tsx` entfernt
- `App.tsx` importiert `TemplatesView` direkt aus dem Feature-Modul
- ungenutzte Entwurfs-/Zwischenablage-Restlogik der Verwaltungsseite entfernt
- README auf Architekturstand 0.4.44 aktualisiert
- Regressionstest ergänzt

## Architektur

Die Vorlagen-Seite bleibt Verwaltung:

- Vorlagen suchen
- Vorlagen anzeigen
- Vorlagen anlegen
- Vorlagen bearbeiten
- Vorlagen löschen
- Platzhalterhilfe anzeigen

Konkrete Entwurfserzeugung bleibt in Fallakte und Maßnahme.
