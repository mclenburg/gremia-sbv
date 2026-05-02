# Modal-Responsive-Fix

Version 0.4.12 korrigiert das Größenverhalten der Fall- und Eingabe-Modals.

## Ziel

Modals dürfen nicht horizontal über den Viewport hinauslaufen. Gerade beim Anlegen einer Fallakte muss die Maske ohne horizontales Scrollen bedienbar bleiben.

## Umsetzung

- neue Datei `src/app/caseModalResponsive.css`
- Import in `src/app/App.tsx`
- Modals werden auf `calc(100vw - …)` begrenzt
- große Inhalte scrollen vertikal im Modal
- Formularraster nutzt `auto-fit` und bricht automatisch um
- Aktionsbuttons umbrechen auf kleinen Bildschirmen

## Test

```bash
npm run test:modal-layout
```
