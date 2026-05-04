# Patch 0.8.5-b – Workbench-Layout-Master für SBV-Beteiligung

## Ziel

Das neue Modul „SBV-Beteiligung“ hatte Formular- und Detailbereiche zu roh gerendert. Labels, Eingabefelder und Buttons liefen dadurch nebeneinander, ohne die zentrale responsive Layout-Basis zu nutzen.

Dieser Patch führt einen wiederverwendbaren Workbench-Layout-Master ein und stellt das Beteiligungsmodul darauf um.

## Neu

- `src/app/shared/components/WorkbenchLayout.tsx`
  - `WorkbenchSummary`
  - `WorkbenchGrid`
  - `WorkbenchListPanel`
  - `WorkbenchDetailPanel`
  - `WorkbenchCreatePanel`
  - `IndustrialFormGrid`
  - `IndustrialField`
  - `IndustrialCheckboxRow`
  - `IndustrialActionRow`

## Zentrale CSS-Basis

Erweitert wurde:

- `src/app/ui/responsiveDesign.css`

Neu sind wiederverwendbare Klassen für:

- Workbench-Kennzahlen,
- Listen-/Detail-Layout,
- Create-Panels,
- responsive Formularraster,
- Feldlabels,
- Checkbox- und Aktionszeilen.

## Beteiligungsmodul

Geändert wurde:

- `src/app/features/participation/ParticipationView.tsx`
- `src/app/features/participation/participationWorkbench.css`

Das Modul nutzt jetzt zentrale Layout-Komponenten. Die modulbezogene CSS-Datei enthält nur noch fachliche Akzente, insbesondere Cards, Prüfmatrix und rechtlichen Hinweis.

## Ergebnis

- Kein rohes Nebeneinanderlaufen von Formularfeldern mehr.
- Formularfelder sind sauber gruppiert und responsiv.
- Detailbereich ist strukturiert und kompakt.
- Neue Fachmodule können denselben Layout-Master verwenden.
