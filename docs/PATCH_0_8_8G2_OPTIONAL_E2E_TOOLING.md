# Patch 0.8.8-g.2 – Playwright optional machen

## Anlass

Unter Windows scheiterte `npm install`, weil die neu eingeführte Playwright-Abhängigkeit über das Netzwerk geladen werden musste. Das ist für eine normale Build- oder RC-Umgebung zu fragil.

## Änderung

- `@playwright/test` ist nicht mehr reguläre `devDependency`.
- Normales `npm install` lädt Playwright nicht mehr automatisch nach.
- E2E-Tests liegen nun unter `e2e/` statt `tests/e2e/`.
- Alte `tests/e2e`-Dateien werden per Source-Cleanup entfernt.
- Der E2E-Runner nutzt nur eine bewusst installierte lokale Playwright-CLI oder `PLAYWRIGHT_CLI`.

## Nutzung

Normale Entwicklung / Build:

```bash
npm install
npm run test
npm run build
```

E2E optional:

```bash
npm run test:e2e:deps
npm run test:e2e:install
npm run test:e2e
```

## Datenschutz

Die E2E-Datenbankisolation bleibt unverändert. Der Runner setzt `GREMIA_SBV_DATA_DIR` auf ein temporäres Verzeichnis unter `/tmp/gremia-sbv-e2e-*` bzw. das entsprechende System-Temp-Verzeichnis.
