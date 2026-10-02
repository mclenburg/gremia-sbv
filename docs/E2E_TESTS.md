# E2E-Tests

Die E2E-Tests prüfen kritische Arbeitswege in einer isolierten synthetischen Testumgebung. Der Runner erzeugt ein temporäres `GREMIA_SBV_DATA_DIR`, damit keine produktiven Daten berührt werden.

## Start

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:debug
```

`test:e2e` führt die Browser-Suite aus. Für die zusätzlich gepackte Desktop-Anwendung gibt es `npm run test:e2e:full-product`; `npm run test:e2e:full-product:reuse` verwendet einen vorhandenen Build. Diese Suite verwendet je Testslot einen isolierten Test-Tresor.

## Abgedeckte Kernflüsse

- App startet in isolierter Testumgebung.
- Fallakten-Workbench öffnet synthetische Fälle.
- Inline-Hilfe ist per Tastatur erreichbar.
- Inline-Kommandos funktionieren in großen Textfeldern.
- Personenmodul öffnet ohne horizontalen Overflow.
- Personenimport führt durch Quelle, Vorschau, Spaltenmapping, Validierung und Ergebnis.
- Responsive Layouts bleiben bei HD small, Laptop, Full HD und QHD stabil.
- Compliance Light-/Dark-Mode bleibt lesbar.

Die vollständige Produkttour wird mit `npm run test:e2e:complete-tour` gezielt ausgeführt und ist auch Teil des lokalen Release-E2E-Gates.

## Barrierefreiheit

Dialoge müssen `role="dialog"`, `aria-modal`, stabile Labels und Fokus-Rückkehr haben. Tests sollen vorrangig nutzernahe Rollen/Labels verwenden; `data-e2e` ist für technisch notwendige, stabile Anker zulässig.

## Plattformhinweise

Unter Windows nutzt der Runner `playwright.cmd`. E2E-Tests dürfen keine `/tmp`- oder Laufwerksannahmen enthalten.

## Lokales Release-Gate

GitHub Actions führt die Browser-E2E-Tests aus Kostengründen nicht im taggebundenen Free-Account-Release-Build aus. Für Releases ist stattdessen lokal verbindlich:

```bash
npm run release:local-e2e
```

Das Skript installiert die isolierten Playwright-/Axe-Werkzeuge und führt danach in fester Reihenfolge aus:

1. `npm run test:e2e:setup`
2. `npm run test:e2e:ui-flows`
3. `npm run test:e2e:visual-a11y`
4. `npm run test:e2e:isolated`

Die Projekte bündeln Nutzerflüsse einschließlich Produkttour, Visual-/Responsive-/Accessibility-Prüfungen sowie Tests mit eigener Browserinstanz. Die Full-Product-Suite ist ein eigener Lauf gegen ein gepacktes Desktop-Artefakt und nicht Teil von `release:local-e2e`.
