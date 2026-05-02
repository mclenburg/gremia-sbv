# Wissensdatenbank / SBV-Kompass

Version: 0.4.2

Die Wissensdatenbank ist der fachliche Unterbau für das `§§`-Overlay, die Fallakte und spätere Vorlagen-/Checklistenfunktionen.

## Kernidee

Die Datenbank ist keine bloße Gesetzessammlung, sondern ein SBV-Arbeitskompass:

- Rechtsnormen suchen
- SBV-Bedeutung lesen
- Praxishinweise pflegen
- eigene Kommentare speichern
- Rechtsprechungsnotizen ergänzen
- Checklisten je Norm führen
- Normen mit Fallakten verknüpfen

## Datenschutz

Normen und allgemeine Kommentare sind fachlich nicht sensibel. Fallverknüpfungen sind hingegen personenbezogen und bleiben deshalb im SQLCipher-Tresor.

Wissensexporte enthalten standardmäßig keine Fallbezüge.

## Tabellen

- `legal_norms`
- `case_legal_references`
- `norm_comments`
- `norm_case_law`
- `norm_checklist_items`

## Overlay-Integration

`§§` in Protokollfeldern fügt einen Normverweis ein. Wenn eine Fallakte geöffnet ist, wird die Norm zusätzlich als Rechtsbezug am Fall gespeichert.

## Tests

```bash
npm run test:knowledge
```
