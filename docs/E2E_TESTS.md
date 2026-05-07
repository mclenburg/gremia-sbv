# E2E-Tests

Stand: 0.8.13-i

## Zweck

Die E2E-Tests prüfen RC-kritische Nutzerflüsse mit synthetischen Daten. Sie dürfen niemals produktive SBV-Datenbanken öffnen oder verändern.

## Isolation

Der E2E-Runner setzt:

- `GREMIA_SBV_E2E=1`
- `GREMIA_SBV_E2E_DATA_DIR`
- `GREMIA_SBV_DATA_DIR`

Das Datenverzeichnis muss unter dem System-Temp liegen und `gremia-sbv-e2e-` enthalten. Andernfalls bricht der Runner ab.

## Ausführung

```bash
npm run test:e2e:setup
npm run test:e2e
```

## RC-kritische Selektoren

- `data-e2e="main-nav-cases"`
- `data-e2e="main-nav-compliance"`
- `data-e2e="case-row-TEST-0001"`
- `data-e2e="inline-help-dialog"`
- `data-e2e="note-entity-link"`

## Responsive-Layout

`e2e/responsive-layout.spec.ts` prüft mehrere Desktop-Auflösungen auf horizontale Überläufe, sichtbare Hauptnavigation, Fallaktenliste, Compliance-Ansicht und stabile Dialogdarstellung.

## Barrierefreiheit

`e2e/accessibility.spec.ts` prüft Tastaturflüsse, Dialoge, Rollen, Fokusführung und fachliche Labels ohne technische UUIDs.
