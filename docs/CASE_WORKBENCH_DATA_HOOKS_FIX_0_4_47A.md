# Gremia.SBV 0.4.47a – Build-Fix für Fallakten-Datenhooks

## Problem

Nach 0.4.47 fehlten zwei lokale Bindings:

- `setCaseLegalReferences` wurde aus `useCaseWorkbenchData` zurückgegeben, aber in `CasesView` nicht destrukturiert.
- `selectedCaseId` wurde im `RetentionSettingsPanel` versehentlich entfernt, obwohl dort ein eigener Fallauswahl-State benötigt wird.

## Änderung

- `setCaseLegalReferences` in der Hook-Destrukturierung ergänzt.
- Lokalen `selectedCaseId`-State im `RetentionSettingsPanel` wiederhergestellt.
- Regressionstest ergänzt.
