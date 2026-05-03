# Gremia.SBV 0.4.46a – README-Versionstest stabilisiert

## Problem
Der Test `readmeFinalAndCleanup0443.test.ts` prüfte hart auf `Stand: 0.4.43`.

Nach späteren Versionen ist das falsch, weil die README bewusst auf die aktuelle Version hochgezogen wird.

## Änderung
Der Test liest die aktuelle Version aus `package.json` und erwartet entsprechend:

```ts
expect(readme).toContain(`Stand: ${packageJson.version}`);
```

Damit bleibt der Test für Folgereleases stabil.
