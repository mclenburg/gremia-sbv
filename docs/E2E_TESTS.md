# E2E-Tests

Gremia.SBV nutzt ab 0.8.8-g eine kleine Playwright-basierte UI-Smoke-Testbasis. Ab 0.8.8-g.2 ist Playwright bewusst **optional** und nicht mehr Teil der normalen `npm install`-Abhängigkeiten.

## Zweck

Die E2E-Tests prüfen nicht jede Fachfunktion vollständig. Sie sichern vor dem RC insbesondere:

- App startet im entsperrten synthetischen Testkontext,
- Fallakte ist erreichbar,
- Kurzbefehls-Hilfe funktioniert per Strg+H/Esc,
- Compliance Center bleibt im Darkmode dunkel und im Lightmode hell.

## Datenschutz und Datenbank-Isolation

Die E2E-Tests dürfen keine produktiven SBV-Daten verwenden. Der Runner `scripts/run-e2e.cjs` erzeugt deshalb bei jedem Lauf ein eigenes temporäres Datenverzeichnis mit dem Präfix `gremia-sbv-e2e-` und setzt:

```bash
GREMIA_SBV_E2E=1
GREMIA_SBV_E2E_DATA_DIR=/tmp/gremia-sbv-e2e-...
GREMIA_SBV_DATA_DIR=/tmp/gremia-sbv-e2e-...
```

Der Runner bricht ab, wenn ein manuell übergebenes Testdatenverzeichnis nicht unter dem System-Temp liegt oder nicht das Präfix `gremia-sbv-e2e-` enthält.

Die Browser-Smoke-Tests verwenden zusätzlich eine synthetische Bridge (`tests/e2e/support/mockBridgeInit.js`). Dadurch wird keine echte produktive Vault-Datenbank geöffnet.

## Normale Installation

Für normale Entwicklung, Build und RC-Checks reicht weiterhin:

```bash
npm install
npm run test
npm run build
```

Playwright wird dabei nicht automatisch installiert. Dadurch können Windows-Builds und Standardinstallationen nicht an optionalen E2E-Downloads scheitern.

## E2E-Abhängigkeiten installieren

Nur wenn E2E-Tests wirklich ausgeführt werden sollen:

```bash
npm run test:e2e:setup
```

Das installiert Playwright lokal ohne dauerhafte Aufnahme in `package.json` und installiert anschließend Chromium für Playwright.

Danach:

```bash
npm run test:e2e
```

Mit sichtbarem Browser:

```bash
npm run test:e2e:headed
```

Containerlauf:

```bash
npm run test:e2e:docker
```

## Testdaten behalten

Nur zur Fehlersuche:

```bash
npm run test:e2e -- --keep-data
```

## Abhängigkeitsregel

Der E2E-Runner nutzt bewusst nur die lokal installierte Playwright-Version aus `node_modules/.bin`. Er lädt keine Playwright-Version über `npx` nach, damit die Testumgebung reproduzierbar bleibt und normale Builds nicht durch optionale UI-Testabhängigkeiten blockiert werden.
