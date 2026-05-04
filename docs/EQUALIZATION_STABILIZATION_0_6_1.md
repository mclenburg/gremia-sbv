# Gremia.SBV 0.6.1 – Gleichstellung/GdB Stabilisierung und Fallakten-UX

## Ziel

0.6.1 stabilisiert das neue Gleichstellung-/GdB-Modul und korrigiert zwei UX-Regressions in der Fallakte.

## Gleichstellung / GdB

- Dopplung von Modulüberschrift und Prozessüberschrift entfernt.
- Der geplante Entwicklungs-Hinweis wird entfernt, weil das Modul aktiv ist.
- Das Detailformular erhält eine Statusführung mit Ziel, Warnungen und Statusvorschlag.
- Die Dokument-/Vorlagenintegration wird in der Fallakte für Gleichstellung aktiviert.
- Gleichstellungsplatzhalter können im Prozessvorlagenkontext ausgewertet werden.

## Fallakte

- Neues-Fall-Modal bekommt wieder horizontalen Scroll, damit breite Formularinhalte nicht abgeschnitten werden.
- Die Falltabelle wird auf maximal fünf sichtbare Einträge pro Seite begrenzt.
- Pagination mit Zurück/Weiter wurde ergänzt.

## Tests

Neue Tests:

```text
tests/equalizationStabilization061.test.ts
tests/caseRegisterPagination061.test.ts
tests/caseCreateModalScroll061.test.ts
```
