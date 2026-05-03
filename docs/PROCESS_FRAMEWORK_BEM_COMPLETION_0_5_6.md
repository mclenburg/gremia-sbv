# Gremia.SBV 0.5.6 – Generic Process Framework & BEM-Komplettierung

## Generic Process Framework

Neu:

```text
src/app/shared/process/ProcessOverview.tsx
src/app/shared/process/ProcessDetailHeader.tsx
```

Enthalten sind:

- `ProcessOverviewPage`
- `ProcessOverviewCard`
- `ProcessOverviewGroup`
- `groupProcessOverviewRecords`
- `isIsoBeforeNow`
- `ProcessDetailHeader`
- `ProcessSection`

Prävention und BEM verwenden die gemeinsame Maßnahmenübersicht. BEM nutzt zusätzlich den gemeinsamen Detailheader.

## BEM fachlich erweitert

Das BEM-Modul enthält nun strukturierte Felder für:

- Datenschutzhinweis erteilt am
- Einwilligungsumfang / Beteiligte
- Widerruf am
- Aufbewahrung / Löschhinweis
- Verantwortliche / Umsetzung
- Abschlussgrund

## Datenbank

Neue Migration:

```text
database/migrations/0016_bem_completion.sql
```

Neue Spalten:

```text
privacy_notice_at
consent_scope
consent_withdrawn_at
data_retention_note
measure_owners
completion_reason
```

`APP_SCHEMA_VERSION` steht auf `0016`.

## Wirkung

BEM ist damit nicht mehr nur ein allgemeines Formular, sondern bildet die wesentlichen fachlichen Stationen ab: Angebot, Freiwilligkeit, Datenschutz, Einwilligung, Maßnahmenplan, Wirksamkeit und Abschluss.
