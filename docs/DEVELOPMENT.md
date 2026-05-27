# Entwicklung

## Grundregeln

- Kleine, fokussierte Dateien.
- Feature-Views nicht monolithisch aufbauen.
- `App.tsx` verdrahtet nur; Feature-Handler gehören in Hooks.
- Policies sind pure Functions.
- Services enthalten Orchestrierung, aber keine UI-Logik.
- Tests prüfen Verhalten statt Quelltext-Existenz, soweit möglich.
- Barrierefreiheit und Responsivität sind Teil der Definition of Done.

## Standardprüfung

```bash
npm run test
npm run test:e2e
npm run build
npm run rc:check
```

## vorherigen-Entwicklungsfokus

Bei Änderungen am Personenmodul sind immer mitzuprüfen:

- Import-Mapping inklusive Vollnamen-Spalten,
- optionale Personalnummer,
- anonyme Anfrage,
- Fallaktenbindung,
- Datenschutz-Lifecycle,
- Compliance Center,
- iCal-Export,
- alte Tests mit veralteten Annahmen.

## Testqualität

String-Matching-Tests sind nur für Dokumentations- und Struktur-Gates akzeptabel. Fachlogik muss durch Behavior-Tests abgesichert werden. Neue Tests müssen plattformunabhängig sein und keine festen absoluten Pfade oder rohen Zeilenendungsannahmen enthalten.
