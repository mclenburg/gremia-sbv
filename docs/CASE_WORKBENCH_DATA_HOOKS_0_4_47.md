# Gremia.SBV 0.4.47 – Fallakten-Datenhooks und Register

## Ziel

Die Fallakte wird weiter aus `workflowViews.tsx` herausgelöst, ohne die fachlich riskante Notiz- und Inline-Overlay-Logik schon anzufassen.

## Neu

- `src/app/features/cases/CaseRegister.tsx`
- `src/app/features/cases/useCaseRegisterFilter.ts`
- `src/app/features/cases/useCaseWorkbenchSearch.ts`
- `src/app/features/cases/useCaseWorkbenchData.ts`

## Ausgelagert

- Fallregister mit Filterfeld und Tabelle
- Falllistenfilter
- Volltextsuche in der Fallakte
- Laden der Fallbestandteile:
  - Notizen
  - Dokumente
  - Rechtsbezüge
  - Präventionsmaßnahmen
- Deep-Link-Verarbeitung aus Übersichtsseiten in konkrete Fallaktenknoten
- Reload der ausgewählten Fallakte

## Noch bewusst in CasesView

- Notizeditor
- Inline-Befehle und Overlays
- Dokumentenimport/-export
- Präventionsdetailformular
- Fallanlage- und Maßnahmenmodals

Diese Bereiche werden in späteren Schnitten extrahiert.
