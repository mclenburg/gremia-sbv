# Patch 0.8.8-g – isolierte E2E-Smoke-Tests

## Ziel

Vor dem ersten RC gibt es eine automatisierte UI-Smoke-Testbasis, ohne die produktive SBV-Datenbank zu berühren.

## Umsetzung

- Playwright als E2E-Testwerkzeug ergänzt.
- Eigener E2E-Runner `scripts/run-e2e.cjs` erzeugt pro Lauf ein frisches temporäres Datenverzeichnis.
- Der Runner setzt `GREMIA_SBV_DATA_DIR` ausschließlich auf diese temporäre Testumgebung.
- Schutzabbruch verhindert versehentliche Nutzung produktiver Pfade.
- Renderer-Tests laufen über einen dedizierten Vite-Port 5174.
- Browser-Smoke-Tests erhalten eine synthetische Bridge mit synthetischen Testfällen.

## Neue Befehle

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:debug
npm run test:e2e:docker
npm run test:e2e-guard-088g
```

## Datenschutz

Die E2E-Tests verwenden keine echten Namen, Diagnosen oder produktiven Datenbanken. Alle Testfälle sind synthetisch (`TEST-0001`, `Testperson Alpha`).
