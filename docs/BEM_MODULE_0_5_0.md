# Gremia.SBV 0.5.0 – BEM-Grundmodul

## Ziel

0.5.0 ergänzt das BEM-Modul als erstes neues Fachmodul nach der Refaktorierungsphase. Die Architektur folgt dem Präventionsmodul:

- eigenständiges Datenmodell,
- eigene Migration,
- eigener Service,
- eigener IPC-Kanal,
- eigene Übersichtsseite,
- eigenes Detailformular,
- Integration in die Fallakte,
- statusgebundene Vorlagen.

## Neue Dateien

```text
src/app/core/models/bem.model.ts
src/app/features/bem/BemView.tsx
src/app/features/bem/BemProcessDetail.tsx
src/app/features/bem/bemShared.ts
services/bemService.ts
services/bemWorkflowPolicy.ts
electron/ipc/bemIpc.ts
database/migrations/0015_bem_process.sql
```

## Fachliche Mindestfunktionen

- BEM-Verfahren an Fallakte anlegen
- BEM-Verfahren im Fallbaum anzeigen
- BEM-Verfahren rechts im Detailpanel bearbeiten
- BEM-Übersichtsseite von Dashboard aus
- Gruppierung nach Status
- Klick aus Übersicht öffnet Fallakte direkt auf das BEM-Verfahren
- statusgebundene BEM-Vorlagen über `massnahme:bem` und `status:<status>`

## Datenschutz

BEM-Notizen und BEM-Dokumente sind regelmäßig hochsensibel. Das Detailformular enthält deshalb ein eigenes Feld für vertrauliche SBV-Notizen. Export und Vorlagen bleiben an ExportGuard und bewusste Auswahl gebunden.

## Nächste Schritte

- BEM-spezifische Systemvorlagen
- BEM-Datenschutz-Hinweis im ExportGuard verschärfen
- BEM-Fristen und Wirksamkeitsprüfung auf Dashboard verdichten
- später: BEM-Kompass / Checklistenansicht
