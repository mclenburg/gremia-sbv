# Gremia.SBV 0.4.49 – Inline-Befehle als Feature-Bündel

## Ziel

Die Inline-Befehle der Fallakte (`//`, `@@`, `##`, `§§`, `!!`, `>>`, `^^`, `~~`) werden nicht länger als großer JSX-Block in `workflowViews.tsx` gehalten.

## Änderungen

Neu:

- `src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx`
- `src/app/features/cases/inlineCommands/inlineCommandSearch.ts`

Geändert:

- `src/app/features/cases/InlineCommandOverlays.tsx` ist nur noch ein Re-Export.
- `workflowViews.tsx` rendert nur noch `<InlineCommandOverlays />`.
- Suchlogik für Fall- und Normauswahl liegt in `inlineCommandSearch.ts`.
- `hasAnyInlineCommandOverlay` bündelt die Overlay-Prüfung.

## Bewusst noch in CasesView

Die eigentlichen Handler bleiben vorerst in `CasesView`, weil sie Fristen, Kontakte, Normbezüge und Notiz-State verändern. Der nächste saubere Schritt ist ein Hook `useInlineCommands`, der diese Handler kontrolliert übernimmt.
