# Gremia.SBV 0.4.43 – Aufräumen, Tests, README final

## Ziel

0.4.43 ist ein Aufräumstand nach den ersten Refaktorierungsschritten.

## Änderungen

- `README.md` auf den aktuellen Stand gebracht.
- Nicht implementierte externe Schnittstellen werden nicht mehr in der README beschrieben.
- Version auf `0.4.43` gesetzt.
- Testskripte ergänzt:
  - `test:readme-final`
  - `test:refactor`
- Optionales Aufräumskript ergänzt:
  - `scripts/cleanup-legacy-artifacts.cjs`
  - `npm run cleanup:legacy`

## Warum ein Skript?

Ein Patch-ZIP kann Dateien überschreiben oder ergänzen, aber beim Entpacken nicht zuverlässig Dateien löschen. Deshalb entfernt das Skript klar benannte Altlasten bewusst und nachvollziehbar.

## Trockenlauf

```bash
node scripts/cleanup-legacy-artifacts.cjs --dry-run
```

## Ausführen

```bash
npm run cleanup:legacy
```

## Nächster Refaktorierungsschritt

Als nächstes sollte `TemplatesView` aus `workflowViews.tsx` herausgelöst werden. Danach folgt die Fallakte in mehreren kleineren Schnitten.
