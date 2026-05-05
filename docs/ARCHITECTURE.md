# Architektur

## Leitprinzip

Gremia.SBV ist fallaktenzentriert:

```text
Fallakte → Maßnahmen → Fristen/Dokumente/Vorlagen → Berichte/Compliance
```

Personenbezogene SBV-Arbeit wird aus der Fallakte heraus angelegt und fortgeschrieben. Fachmodule außerhalb der Fallakte sind Cockpits, Übersichten oder Auswertungen.

## Schichten

```text
src/app/        React/Vite Renderer
electron/       Electron Main und Preload
services/       Fachservices, Datenzugriff, Reports, Audit
database/       Schema und Migrationen
scripts/        Build-, Diagnose- und Wartungsskripte
tests/          Service-, Policy-, Build- und Readiness-Tests
```

## Maßnahmenarchitektur

`case_measures` ist die gemeinsame Klammer für fachliche Vorgänge:

- BEM
- Prävention
- SBV-Beteiligung
- Kündigungsanhörung
- Gleichstellung / GdB
- Arbeitsplatzgestaltung
- sonstige Maßnahme

Jede Maßnahme hat gemeinsame Basisdaten wie Fallbezug, Typ, Status, Risiko, nächsten Schritt, Frist und Nachbearbeitungsstatus. Typspezifische Detaildaten liegen in Detailtabellen oder Fachservices.

## Inlinebefehle

Inlinebefehle dienen der Live-Erfassung in Gesprächen. Sie dürfen personenbezogene Maßnahmen nur im Kontext einer geöffneten Fallakte anlegen. Die Hilfe ist über `Strg+H` erreichbar.

## Datenschutz

Die App arbeitet offline-first. Der lokale Tresor, Audit-Hash-Chain, Auto-Lock, temporäre Arbeitskopien und Compliance-Dokumente bilden die technische Grundlage. Organisatorische Datenschutzfreigaben bleiben außerhalb der App erforderlich.
