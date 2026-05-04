# Gremia.SBV 0.7.2 – Fachliche Härtung Kündigungsanhörung

## Ziel

0.7.2 macht das Kündigungsmodul fachlich belastbarer. Es geht nicht nur um Datenerfassung, sondern um Fristbewusstsein, Schutzstatusprüfung und gezielte SBV-Handlungsfähigkeit.

## Änderungen

### Fristlogik

Die Policy enthält jetzt eine Arbeitshilfe für Fristvorschläge:

- außerordentlich / Verdachtskündigung: +3 Tage
- sonstige Kündigungsarten: +7 Tage

Das ist bewusst als Arbeitshilfe formuliert. Maßgeblich bleiben Zugang, konkrete Anhörungslage und rechtliche Prüfung.

### Warnlogik

Neue beziehungsweise geschärfte Warnungen:

- Schutzstatus unklar / nicht bekannt = kritisch
- SBV-Stellungnahmefrist läuft innerhalb von 24 Stunden ab
- Integrationsamt nicht dokumentiert trotz möglichem besonderem Kündigungsschutz
- Stellungnahme in Arbeit, aber Stellungnahmetext fehlt

### Detailformular

`TerminationProcessDetail` zeigt jetzt:

- Fristvorschlag, wenn Eingang vorliegt und keine SBV-Frist gesetzt ist
- rechtlichen Hinweis, dass Fristvorschläge Arbeitshilfen sind
- Statusvorschlag und Fristvorschlag sauber gruppiert

### Vorlagen

Neu:

```text
kuendigung-frist-schutzstatus-check
```

Die SBV-Stellungnahmevorlage wurde um Beteiligungsrechte und besonderen Kündigungsschutz geschärft.

## Build-Hygiene

`postinstall` bleibt gesetzt und getestet:

```json
"postinstall": "electron-builder install-app-deps"
```
