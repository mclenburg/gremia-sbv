# Gremia.SBV 0.5.1a – Build- und Migrationsfix

## Behoben

### InlineCommandOverlays

- fehlende Imports der Inline-Draft-Typen ergänzt
- `Setter<T>` so verengt, dass Callback-Parameter wieder kontextuell typisiert werden
- dadurch keine impliziten `any`-Parameter mehr in den Inline-Overlay-Callbacks

### CaseToast

- LiveRegion-Ankündigung nutzt die tatsächlichen Felder:
  - `caseToast.text`
  - `caseToast.variant`

### BEM-Migration

Frühe 0.5.0-Teststände konnten eine unvollständige `bem_processes`-Tabelle ohne `status`-Spalte hinterlassen. Die Migration baut diese Tabelle in 0.5.1a kontrolliert über `bem_processes_legacy_0500` neu auf und mapped alte `current_phase`-Werte auf neue `status`-Werte.
