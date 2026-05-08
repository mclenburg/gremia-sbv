# Gremia.SBV 0.9.0-rc.1-m

## Build- und Teststabilität

- RC-Regressionstests für Fallakte/Prävention/CSS lesen Quelltexte jetzt zeilenendungsunabhängig, damit `npm run test` auch bei Windows-Checkouts mit CRLF stabil bleibt.
- Der E2E-Runner normalisiert übergebene Spec-Pfade und nutzt unter Windows weiterhin den lokalen Playwright-`.cmd`-Shim.
- Die Präventions-Maßnahmenfelder bleiben bei Lost-Focus-Speicherung; der Inline-Kommando-Scan bleibt auf der ursprünglichen `findFirstTextCommand(event.target.value)`-Logik.

## RC-Freeze

Ab `0.9.0-rc.1-m` bleibt der Funktionsumfang eingefroren: Es werden **keine neuen Fachfeatures** ergänzt und insbesondere **keine Cloud-Synchronisation** eingeführt.

Zulässig sind nur noch:

- **Security-Fixes**,
- Korrekturen gegen **Datenverlust**,
- Build-, Test- und Plattformstabilisierung,
- Barrierefreiheits- und Datenschutzkorrekturen,
- **Dokumentationskorrekturen**.

Die Lizenz bleibt **AGPL-3.0-or-later**.

## Nachtrag: Maßnahmenfelder speichern erst bei Fokusverlust

- Die Lost-Focus-Speicherung für lange Präventionsfelder wurde auf die übrigen fallaktenbezogenen Maßnahmen übertragen.
- SBV-Beteiligung und Arbeitsplatzgestaltung schreiben Textfelder/TextAreas nicht mehr bei jedem Tastendruck in die Datenbank.
- Große Maßnahmenfelder nutzen weiterhin die bestehende Inline-Kommando-Erkennung über `findFirstTextCommand(event.target.value)`.
- Der BEM-Titel speichert ebenfalls erst bei Fokusverlust, damit auch kurze Textfelder nicht pro Zeichen persistieren.
