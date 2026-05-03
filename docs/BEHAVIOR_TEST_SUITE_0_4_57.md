# Gremia.SBV 0.4.57 – gebündelte Verhaltens- und Funktionstests

## Ziel

Dieser Patch ändert keine Fachlogik. Er ergänzt eine gebündelte Testschicht für die kritischen SBV-Workflows.

## Neue Tests

```text
tests/fallakteBehavior0457.test.ts
tests/inlineCommandIntegration0457.test.ts
tests/preventionWorkflow0457.test.ts
tests/exportPrivacyGuard0457.test.ts
tests/templatesBehavior0457.test.ts
tests/accessibilityKeyboard0457.test.ts
tests/databaseMigrationSafety0457.test.ts
```

## Abgedeckte Bereiche

- Fallakte
- Inline-Kürzel
- Präventionsworkflow
- ExportGuard und Datenschutz
- Vorlagen und Platzhalter
- Tastatur-/ARIA-Grundanforderungen
- Datenbank-, Migrations- und Portabilitätssicherheit

## Hinweis

Ein Teil der Tests ist bewusst als Contract-/Source-Test formuliert. Das passt zur aktuellen Refaktorierungsphase: Es sichert die fachlichen Grenzen, ohne UI-Rendering-Tests oder Datenbank-Integration künstlich zu erzwingen.
