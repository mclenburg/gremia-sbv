# Gremia.SBV 1.0 Qualitätsfreigabe-Checkliste

Diese Checkliste beschreibt den verbindlichen Stand für den öffentlichen 1.0-Release. Sie ist kein Wunschzettel für spätere Arbeit, sondern ein Release-Gate.

## Produktlinie

- Gremia.SBV bleibt offline-first und verarbeitet SBV-Falldaten lokal.
- Exporte, Backups und Übergaben zeigen sichtbares Ergebnisfeedback, ohne sensible Inhalte ins Audit zu schreiben.
- Die README richtet sich zuerst an SBVen und erst danach an Entwicklerinnen und Entwickler.

## Architektur-Gates

- Feature-Views orchestrieren nur noch. Eigener Prozess-State gehört in Hooks, UI in Teilkomponenten und Fachlogik in kleine Logic-/Utility-Dateien.
- Neue UI nutzt zuerst zentrale Workbench-, Panel-, Button-, Form-, Badge-, Dialog-, Listen- und Empty-State-Komponenten.
- Keine neuen Feature-CSS-Dateien und keine direkten Feature-CSS-Imports.
- Audit-Ereignisse werden nur über zentrale Builder erzeugt.
- Große Dateien benötigen eine fachliche Begründung; neue Monolithen sind Release-Blocker.

## Accessibility-Gates

- Dialoge haben `role="dialog"` oder `role="alertdialog"`, `aria-modal`, Fokussteuerung, ESC-Verhalten und Fokus-Rückgabe.
- Formulare verknüpfen Label, Hilfe und Fehler über `htmlFor`, `aria-describedby`, `aria-invalid`, `aria-required` und `role="alert"`.
- Icon-only-Buttons müssen ein `aria-label` besitzen.
- Asynchrone erfolgreiche Aktionen und Fehler in Kernflows melden sich über Live-Regionen.
- Kurzbefehle funktionieren in großen Textareas inklusive Inline-Overlay.

## Test-/Build-Gates

Vor Release müssen grün laufen:

- `npm run build`
- `npm run test:e2e`
- `npm run test:e2e:visual`
- `npm run test:e2e:core-ui-flows`
- `npm run test:e2e:complete-tour`
- `npm run build:readiness:strict`
- `npm run rc:check`

## Visuelle Gates

- Light-Mode enthält keine dunklen Restflächen.
- Dark-Mode enthält keine hellen Fremdflächen.
- Badges sind kantig und nutzen zentrale Status-/Risk-/Deadline-Tonalitäten.
- Dropdowns, Inputs, Textareas und Buttons nutzen das Industrial-Chrome.

## Erweiterbarkeit

Community-Beiträge müssen sich an die zentrale UI-Schicht, Audit-Builder, Datenschutzlinie und A11y-Gates halten. Abweichungen werden nur akzeptiert, wenn sie fachlich begründet, klein und getestet sind.
