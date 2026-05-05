# Patch 0.8.8-g.1 – E2E-Runner ohne npx-Auto-Install

## Problem

`npm run test:e2e` konnte bei fehlender lokaler Playwright-Installation automatisch über `npx` eine Playwright-Version nachladen. Das führte zu einer Nachfrage und in der beobachteten Umgebung anschließend zu einem Node-/ESM-Fehler.

## Änderung

Der E2E-Runner verwendet jetzt ausschließlich das lokale Binary aus `node_modules/.bin/playwright`.

Fehlt Playwright lokal, bricht der Runner kontrolliert ab und nennt die nötigen Schritte:

```bash
npm install
npm run test:e2e:install
npm run test:e2e
```

## Schutz der produktiven Datenbank

Die vorhandene Datenbankisolation bleibt unverändert: der Runner setzt `GREMIA_SBV_DATA_DIR` ausschließlich auf ein temporäres Verzeichnis mit Präfix `gremia-sbv-e2e-`.
