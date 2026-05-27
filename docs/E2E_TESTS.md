# E2E-Tests

Die E2E-Tests prüfen RC-kritische Arbeitswege in einer isolierten synthetischen Testumgebung. Der Runner erzeugt ein temporäres `GREMIA_SBV_DATA_DIR`, damit keine produktiven Daten berührt werden.

## Start

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:debug
```

## Abgedeckte Kernflüsse

- App startet in isolierter Testumgebung.
- Fallakten-Workbench öffnet synthetische Fälle.
- Inline-Hilfe ist per Tastatur erreichbar.
- Inline-Kommandos funktionieren in großen Textfeldern.
- Personenmodul öffnet ohne horizontalen Overflow.
- Personenimport führt durch Quelle, Vorschau, Spaltenmapping, Validierung und Ergebnis.
- Responsive Layouts bleiben bei HD small, Laptop, Full HD und QHD stabil.
- Compliance Light-/Dark-Mode bleibt lesbar.

## vorherigen-Erweiterungen

Neue E2E-Pfade müssen künftig zusätzlich prüfen:

- Person anlegen und Fallakte aus Person erstellen.
- Anonyme Beratungsanfrage ohne Direktidentifikatoren anlegen.
- Statusablauf führt zur Frist und Datenschutzprüfung.
- iCal-Export aus dem Fristenmodul enthält `process_type`-Titel, aber keine Namen.

## Barrierefreiheit

Dialoge müssen `role="dialog"`, `aria-modal`, stabile Labels und Fokus-Rückkehr haben. Tests sollen vorrangig nutzernahe Rollen/Labels verwenden; `data-e2e` ist für technisch notwendige, stabile Anker zulässig.

## Plattformhinweise

Unter Windows nutzt der Runner `playwright.cmd`. E2E-Tests dürfen keine `/tmp`- oder Laufwerksannahmen enthalten.
