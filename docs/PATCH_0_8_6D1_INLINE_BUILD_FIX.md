# Patch 0.8.6-d.1 – Inline-Overlay Build-Fix

Dieser Hotfix behebt einen TypeScript-Buildfehler in `GlobalTextCommandController.tsx`.

## Problem

`draft` wird als React-State mit `GlobalDraft | null` geführt. TypeScript behält die Nicht-Null-Einschränkung aus dem Renderpfad nicht zuverlässig innerhalb der verschachtelten Funktion `applyPrimaryAction()`. Dadurch meldete `npm run build:linux` mehrere Fehler vom Typ `TS18047: 'draft' is possibly 'null'`.

## Lösung

`applyPrimaryAction()` arbeitet jetzt mit einem lokalen `currentDraft`, prüft diesen explizit auf `null` und übergibt ihn an `replaceAndClose()`. Dadurch ist die Nullability-Grenze eindeutig und typstabil.

## Keine fachliche Änderung

Die Command-Funktionalität bleibt unverändert. Es handelt sich ausschließlich um einen Build-Fix.
