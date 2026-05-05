# Patch 0.8.6-a – Inlinebefehle vereinheitlicht und Hilfe ausgelagert

## Ziel

Dieser Patch gleicht die Schnellerfassung für alle zentralen Maßnahmearten an das bestehende Prinzip der SBV-Beteiligung an. Live-Protokolle in der Fallakte sollen weiterhin möglichst kurz und ohne Modulwechsel bedienbar bleiben.

## Neue und vereinheitlichte Kurzbefehle

Neben den bestehenden Befehlen sind jetzt alle Kernmaßnahmen über die zentrale Command-Registry registriert:

- `/bem` – BEM-Vorgang anlegen
- `/praev`, `/prävention`, `/praevention` – Präventionsverfahren anlegen
- `/bet`, `/beteiligung` – SBV-Beteiligung anlegen
- `/kuend`, `/kündigung`, `/kuendigung` – Kündigungsanhörung anlegen
- `/gleich`, `/gdb` – Gleichstellung/GdB anlegen
- `/anp`, `/anpassung`, `/arbeitsplatz` – Arbeitsplatzgestaltung anlegen

Die bestehenden Befehle bleiben erhalten:

- `//`, `/fr`, `/frist`
- `/wv`, `/wiedervorlage`
- `>>`, `/todo`, `/aufgabe`
- `@@`, `/kontakt`
- `##`, `/fall`
- `§§`, `/norm`
- `!!`, `/risiko`
- `^^`, `/vertr`, `/vertraulich`
- `~~`, `/anon`, `/anonym`
- `/vl`, `/vorlage`

## Zentrale Hilfe per Strg+H

Die bisherige lange Erklärungszeile unter Textfeldern wurde ersetzt. Textfelder zeigen nur noch einen kurzen Hinweis auf `Strg+H`.

Neu:

- `src/app/shared/textCommands/TextCommandHelpModal.tsx`
- `src/app/shared/textCommands/textCommandHelp.css`

Die Hilfe ist gruppiert nach:

1. Live-Erfassung
2. Fallakten-Maßnahmen
3. Wissen und Bezüge
4. Datenschutz und Bewertung

## Fallaktengebundene Schnellerfassung

In der Fallakte erzeugen die Maßnahmenbefehle echte Vorgänge über die bestehenden Dienste:

- BEM über `bridge.bem.create(...)`
- Prävention über `bridge.prevention.create(...)`
- SBV-Beteiligung über `bridge.participation.create(...)`
- Kündigungsanhörung über `bridge.termination.create(...)`
- Gleichstellung/GdB über `bridge.equalization.create(...)`
- Arbeitsplatzgestaltung über `bridge.workplaceAccommodation.create(...)`

In allgemeinen Textfeldern werden personenbezogene Maßnahmen nicht außerhalb der Fallakte erzeugt. Dort wird nur ein Hinweis eingefügt.

## Dateien

Geändert:

- `package.json`
- `src/app/App.tsx`
- `src/app/generated/appVersion.ts`
- `services/generated/appMetadata.ts`
- `services/textCommandPolicy.ts`
- `src/app/shared/textCommands/TextCommandTextarea.tsx`
- `src/app/shared/textCommands/GlobalTextCommandController.tsx`
- `src/app/features/cases/inlineCommands/useInlineCommands.ts`
- `src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx`

Neu:

- `src/app/shared/textCommands/TextCommandHelpModal.tsx`
- `src/app/shared/textCommands/textCommandHelp.css`
- `tests/inlineCommands086a.test.ts`

## Test

Neues Script:

```bash
npm run test:inline-commands-086a
```
