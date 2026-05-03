# Gremia.SBV 0.5.0a – Build-Fix BEM-Modul

## Problem

Der 0.5.0-Patch hatte zwei Build-Probleme:

1. `buildProcessTemplateValues` arbeitete mit `PreventionProcessRecord | BemProcessRecord`, aber die Typverengung erfolgte über ein optionales Präventionsfeld. TypeScript konnte dadurch die BEM-only Felder nicht sicher erkennen.
2. `tests/processServices.test.ts` erwartete weiterhin `BemService.createForCase(...)`.

## Änderung

- `isBemProcessRecord(process): process is BemProcessRecord` ergänzt.
- `buildProcessTemplateValues` nutzt jetzt zuerst die BEM-Type-Guard-Branch und danach die Präventions-Branch.
- Template-Prozessart-Erkennung nutzt ebenfalls `isBemProcessRecord`.
- `BemService.createForCase(caseId, triggerDate?)` als Kompatibilitätsmethode ergänzt.
- Regressionstest `tests/bemBuildFix0500a.test.ts` ergänzt.

Anwendungscode wurde nur zur Build-Korrektur angepasst.
