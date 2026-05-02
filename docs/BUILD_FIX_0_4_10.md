# Build-Fix 0.4.10

Dieser Patch ergänzt den fehlenden TypeScript-Typ `InlineAnonymizationDraft` für das Inline-Overlay `~~`.

Ursache: Die UI nutzte bereits den Anonymisierungsdialog, aber der zugehörige Draft-Typ war beim Zusammenführen der letzten Patches nicht in `App.tsx` enthalten. Dadurch konnte TypeScript den `useState`-Typ nicht auflösen und die Callback-Variable im Setter wurde als `any` gewertet.
