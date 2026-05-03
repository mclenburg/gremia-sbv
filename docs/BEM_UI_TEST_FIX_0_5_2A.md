# Gremia.SBV 0.5.2a – Testfix BEM-UI

## Problem

`tests/bemUi052.test.ts` enthielt JSX-Fragmente in doppelt quotierten Strings. Dadurch interpretierte TypeScript Teile des Erwartungsstrings als Code bzw. regulären Ausdruck.

Fehler:

```text
TS1161: Unterminated regular expression literal
```

## Änderung

Die betroffenen Expectations wurden auf gültige Stringliterale umgestellt.

Anwendungscode wurde nicht verändert.
