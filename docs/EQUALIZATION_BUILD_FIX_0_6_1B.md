# Gremia.SBV 0.6.1b – Gleichstellung/Pagination Build-Fix

## Problem

0.6.1 nutzte Pagination-Variablen in `workflowViews.tsx`, hatte aber den React-State nicht deklariert.

Außerdem wurde `equalization` in `openProcessTemplateModal` verwendet, während der Modal-State typseitig nur `prevention | bem` erlaubte.

## Änderung

- `caseRegisterPage` / `setCaseRegisterPage` ergänzt.
- `ProcessTemplateModalState.process` um `EqualizationProcessRecord` erweitert.
- `ProcessTemplateModalState.processType` um `equalization` erweitert.
- `openProcessTemplateModal` akzeptiert jetzt Gleichstellungsprozesse.
