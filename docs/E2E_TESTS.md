# E2E-Smoke-Tests

Gremia.SBV nutzt optionale Playwright-Smoke-Tests für RC-nahe UI-Prüfungen.

## Datenbankschutz

Der E2E-Runner erzeugt bei jedem Lauf ein eigenes temporäres Verzeichnis und setzt:

```bash
GREMIA_SBV_E2E=1
GREMIA_SBV_E2E_DATA_DIR=/tmp/gremia-sbv-e2e-...
GREMIA_SBV_DATA_DIR=/tmp/gremia-sbv-e2e-...
```

Der Test bricht ab, wenn das Datenverzeichnis nicht eindeutig als temporäre E2E-Umgebung erkannt wird.

## Installation

Playwright ist optional und wird nicht durch den normalen Build erzwungen.

```bash
npm run test:e2e:setup
npm run test:e2e
```

## Stabilitätsregeln

- Tests dürfen keine historische Versionsnummer hart verdrahten.
- Navigation wird auf die echte Sidebar/Navigation begrenzt.
- Theme-Tests setzen den isolierten `localStorage` direkt und prüfen danach die real gerenderte Oberfläche.
- Testdaten sind synthetisch und nicht personenbezogen.
