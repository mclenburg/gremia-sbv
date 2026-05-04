# Gremia.SBV 0.7.0 – Kündigungsanhörung

## Ziel

0.7.0 setzt die Kündigungsanhörung als aktives Fachmodul um.

## Enthalten

- aktive Modulnavigation
- Übersicht nach Statusgruppen
- Fallaktenmaßnahme im Fallbaum
- Detailformular in der Fallakte
- Service / IPC / Preload / Window-Bridge
- Warnlogik für Fristen, Schutzstatus und Integrationsamt
- Vorlagen für Unterlagennachforderung, Integrationsamt-Hinweis und SBV-Stellungnahme
- Migration `0017_termination_hearings.sql`

## Fachlicher Fokus

Das Modul prüft und dokumentiert:

- Eingang der Anhörung
- Kündigungsart
- SBV-Stellungnahmefrist
- BR-Parallelverfahren
- Schutzstatus: schwerbehindert / gleichgestellt / Antrag läuft / unklar
- Beteiligung des Integrationsamts
- Arbeitgebervortrag
- fehlende Unterlagen
- SBV-Bewertung
- SBV-Stellungnahme

## Kritische Warnungen

- Eingang der Anhörung fehlt
- SBV-Frist fehlt oder ist überschritten
- besonderer Kündigungsschutz ist möglich, aber Integrationsamt nicht dokumentiert
- Arbeitgebervortrag fehlt

## Build-Hygiene

`postinstall` bleibt gesetzt:

```json
"postinstall": "electron-builder install-app-deps"
```
