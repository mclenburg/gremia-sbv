# Patch 0.8.8-g.2 – Playwright als optionale E2E-Abhängigkeit

## Anlass

Unter Windows scheiterte `npm install`, weil die neu eingeführte Playwright-Abhängigkeit `playwright-core` aus einem nicht erreichbaren Registry-/Proxy-Ziel geladen werden sollte.

## Änderung

- `@playwright/test` wurde aus den normalen `devDependencies` entfernt.
- Standardinstallation und normale Builds benötigen Playwright nicht mehr.
- E2E-Tests bleiben verfügbar, müssen aber explizit vorbereitet werden:

```bash
npm run test:e2e:setup
npm run test:e2e
```

## Schutzregel

Die E2E-Datenbankisolation bleibt unverändert. Der Runner setzt weiterhin ein temporäres `GREMIA_SBV_DATA_DIR` unter dem System-Temp und bricht bei unsicheren Verzeichnissen ab.
