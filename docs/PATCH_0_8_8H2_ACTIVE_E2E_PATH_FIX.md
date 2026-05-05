# Patch 0.8.8-h.2 – aktive E2E-Testpfade korrigieren

## Anlass

Die Korrektur aus 0.8.8-h.1 wurde in `tests/e2e` abgelegt, während der aktive Playwright-Lauf in der lokalen Umgebung die Tests aus `e2e/` ausführt. Dadurch liefen weiterhin die alten fragilen Tests.

## Änderungen

- `playwright.config.ts` nutzt ausdrücklich `testDir: './e2e'`.
- Die stabilisierten Smoke-Tests liegen jetzt im aktiven `e2e/`-Verzeichnis.
- Zusätzlich werden die Dateien zur Rückwärtskompatibilität weiterhin unter `tests/e2e/` mitgeliefert.
- Versionsprüfung liest `package.json` statt historischer Patchversion.
- Navigationsklicks sind auf `Hauptnavigation` begrenzt.
- Theme-Tests setzen das Theme direkt im isolierten E2E-Storage.

## Datenschutz

Die Datenbankisolation bleibt unverändert: E2E verwendet weiterhin ausschließlich temporäre `gremia-sbv-e2e-*`-Verzeichnisse.
