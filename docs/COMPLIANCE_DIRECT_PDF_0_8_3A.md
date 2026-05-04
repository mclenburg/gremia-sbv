# Gremia.SBV 0.8.3a – Compliance Center: direkter PDF-Export

## Problem

Das Compliance Center nutzte zunächst eine Markdown/HTML-Druckansicht über `window.open()` und `window.print()`. Das war inkonsistent zum vorhandenen Berichts-PDF-Pfad.

## Änderung

Compliance-Dokumente nutzen jetzt denselben PDF-Weg wie das Berichte-Modul:

```text
Compliance-Dokument
→ bridge.reports.generate({ type: 'compliance_document', ... })
→ ReportService
→ bestehender PDF-Exportpfad
```

Die Druckansicht wurde aus `ComplianceView` entfernt.

## Betroffen

- TOMs
- DSFA-Entwurf
- DSGVO-/BDSG-Compliance-Auswertung
- DSB-/IT-Security-Freigabeformular
- Antwort auf DSGVO-Auskunftsersuchen

`postinstall` bleibt gesetzt.
