# Entwicklung

## Grundregeln

- Kleine, fokussierte Dateien.
- Feature-Views orchestrieren nur; Feature-Handler gehören in Hooks.
- Policies sind pure Functions.
- Services enthalten Orchestrierung, aber keine UI-Logik.
- Tests prüfen Verhalten statt Quelltext-Existenz, soweit möglich.
- Barrierefreiheit und Responsivität sind Teil der Definition of Done.
- Neue UI wird zuerst gegen die zentralen Komponenten geprüft.

## Standardprüfung

```bash
npm run test
npm run test:e2e
npm run build
npm run release:check
```

## Entwicklungsfokus bei Änderungen an Kernmodulen

Bei Änderungen an Personen, Fallakten, Fristen, Exporten oder Datenschutzfunktionen sind immer mitzuprüfen:

- Import-Mapping inklusive Vollnamen-Spalten,
- optionale Personalnummer,
- anonyme Anfrage,
- Fallaktenbindung,
- Datenschutz-Lifecycle,
- Compliance Center,
- iCal-Export,
- Verhalten bestehender Nutzerflüsse und E2E-Tests.

## Testqualität

String-Matching-Tests sind nur für Dokumentations-, Plattform- und Architektur-Gates akzeptabel. Fachlogik muss durch Behavior-Tests, Service-Tests oder E2E-Flows abgesichert werden. Neue Tests müssen plattformunabhängig sein und dürfen keine festen absoluten Pfade oder rohen Zeilenendungsannahmen enthalten.

Source-Tests dürfen nicht dazu dienen, gute Refactorings zu blockieren. Sie sind nur dann sinnvoll, wenn sie eine echte Architekturgrenze schützen, zum Beispiel zentrale UI-Komponenten, Offline-first-Garantien, Plattformunabhängigkeit oder Testhygiene.
