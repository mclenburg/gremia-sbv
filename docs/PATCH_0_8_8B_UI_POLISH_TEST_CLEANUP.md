# Patch 0.8.8-b – UI-Polish und Testbereinigung

## Ziel

Der Fallakten-Arbeitsbereich wird weiter beruhigt, ohne die Responsivität zu verlieren. Gleichzeitig werden veraltete Layout-Policy-Tests entfernt, die historische CSS-Zwischenstände prüfen und dadurch den aktuellen Stand blockieren können.

## UI-Änderungen

- Die Suchleiste im Fallaktendetail nutzt jetzt eine eigene responsive Klasse.
- Der Suchbutton ist optisch als Sekundäraktion zurückgenommen.
- Der Aktionsfooter bleibt in die Gruppen **Schnellerfassung** und **Maßnahmen** geteilt.
- Primäraktionen bleiben prominent.
- Maßnahmenaktionen bleiben ruhiger und kompakter.
- Die Buttonraster nutzen `auto-fit` statt starrer Breiten.
- Zusätzliche Breakpoints schützen schmale Fenster:
  - `1250px`
  - `900px`
  - `560px`

## Testbereinigung

Der Source-Cleanup entfernt beim Build und jetzt auch vor Tests veraltete Policy-Tests:

- `tests/caseCreateModalScroll061.test.ts`
- `tests/caseCreateModalLayout061a.test.ts`
- `tests/caseWorkbenchDensityPolicy.test.ts`
- `tests/caseWorkbenchLayoutPolicy.test.ts`

Diese Tests prüften alte CSS-Zwischenstände oder widersprüchliche historische Anforderungen. Ersetzt werden sie durch:

- `tests/caseWorkbenchResponsivePolish088b.test.ts`

## Build-/Test-Prozess

`pretest` führt jetzt ebenfalls den Source-Cleanup aus:

```bash
npm run version:generate && npm run source:cleanup
```

Damit sind Build und Testlauf konsistent.
