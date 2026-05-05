# Patch 0.8.8-h.1 – Stabilisierung der E2E-Smoke-Tests

## Anlass

Die Playwright-Smoke-Tests waren funktional richtig ausgerichtet, aber noch zu fragil:

- der Versionscheck war auf `0.8.8-g.2` fest verdrahtet,
- Navigationsbuttons wurden unscharf gesucht und kollidierten mit Dashboard-Karten,
- der Lightmode-Test ging über die Einstellungsoberfläche und war dadurch unnötig langsam und instabil.

## Änderungen

- Der Versionscheck liest jetzt die aktuelle Version aus `package.json`.
- Navigation in E2E-Tests wird auf den echten Navigationsbereich begrenzt.
- Theme-Tests setzen `gremia.sbv.theme` direkt im isolierten Test-`localStorage`.
- Der Compliance-Test prüft weiterhin echte gerenderte CSS-Farben.

## Datenschutz

Die Datenbankisolation bleibt unverändert. E2E-Tests laufen weiterhin ausschließlich mit temporärem `GREMIA_SBV_DATA_DIR` unter `gremia-sbv-e2e-*`.
