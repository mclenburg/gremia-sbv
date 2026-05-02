# Gremia.SBV 0.4.15 – Wartbarkeits-Schnitt

Diese Iteration beginnt die strukturelle Entlastung der bisher sehr großen `App.tsx`.

## Ausgelagert

- `src/app/core/navigation/modules.ts`
  - zentrale Moduldefinitionen
  - `ViewId`
  - `ModuleDefinition`
- `src/app/shell/ShellNav.tsx`
  - Hauptnavigation
- `src/app/shared/components/PlaceholderView.tsx`
  - einheitliche Darstellung unfertiger Module
- `src/app/shared/components/IndustrialTable.tsx`
  - wiederverwendbare Tabellenkomponente
- `src/app/core/keyboard/useModalKeyboardShortcuts.ts`
  - globale Tastaturbedienung
  - Escape, Tab-Fokusfalle, Ctrl/Cmd+Enter, Ctrl/Cmd+N, Ctrl/Cmd+F

## Architekturregel ab jetzt

Neue Views, Modals und komplexe UI-Bereiche werden nicht mehr in `App.tsx` ergänzt.

Zielstruktur:

```text
src/app/views/...
src/app/components/...
src/app/features/...
src/app/shared/...
src/app/core/...
```

## Noch offen

`App.tsx` enthält weiterhin große View-Blöcke. Der nächste sinnvolle Schnitt ist:

1. Fallakte (`CasesView`) in `features/cases/`
2. Prävention in `features/prevention/`
3. Berichte in `features/reports/`
4. Wissensdatenbank in `features/knowledge/`
5. Vorlagen in `features/templates/`

Dieser Patch ist bewusst klein genug gehalten, um die Build-Stabilität nach den letzten Fachmodul-Patches nicht unnötig zu gefährden.
