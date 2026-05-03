# Gremia.SBV 0.5.5 – Module Boundaries & LiveRegion Completion

## Ziel

0.5.5 beseitigt zwei Restschulden:

1. `workflowViews.tsx` wurde als Utility-Quelle missbraucht.
2. `useAnnouncer` war nicht in allen Views mit sichtbaren Statusmeldungen konsequent angebunden.

## Modulschnitt

Aus `workflowViews.tsx` ausgelagert:

- `waitForBridge` → `src/app/core/bridge/waitForBridge.ts`
- `formatDateShort` → `src/app/shared/format/dates.ts`
- `CaseNodeTarget` → `src/app/core/navigation/caseNodeTarget.ts`

Feature-Views importieren diese Utilities nicht mehr aus `workflowViews.tsx`.

## LiveRegion

Neu angebunden:

- `BemView`
  - Lade-/Erfolgsmeldung
  - Fehler
- `CaseNoteModal`
  - `noteError`
  - `noteInfo`
- `KnowledgeView`
  - `error`
  - `message`

Damit werden sichtbare Statusmeldungen in diesen Bereichen auch per Screenreader-LiveRegion angekündigt.

## Bewusst offen

`workflowViews.tsx` enthält weiterhin größere Restblöcke wie `LoginGate`, `DashboardOverview`, `CasesView`, `SettingsView`, `DeadlinesView` und `DeadlineEditor`. Diese sollten in einem späteren Extraktionsschnitt getrennt werden.
