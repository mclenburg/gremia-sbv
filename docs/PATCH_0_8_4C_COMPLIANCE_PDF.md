# Patch 0.8.4-c – Einheitliche PDF-Reports und Compliance-Dokumente

## Ziel

Dieser Patch vereinheitlicht die Erzeugung von PDF-Reports und Compliance-Dokumenten. Compliance-Unterlagen werden nicht mehr als Sonderweg behandelt, sondern als `compliance_document` über denselben Report-Service erzeugt wie Tätigkeits-, Datenschutz-, Controlling- und Integritätsberichte.

## Änderungen

- Version auf `0.8.4-c` angehoben.
- Zentrale App-Version erneut über `scripts/generate-app-version.cjs` erzeugt.
- Compliance-Dokumenttypen erweitert:
  - TOMs,
  - VVT-Eintrag,
  - DSFA-Entwurf,
  - DSGVO-/BDSG-Matrix,
  - Lösch- und Aufbewahrungskonzept,
  - Prozess Betroffenenrechte,
  - Export- und Weitergaberegeln,
  - DSB-/IT-Security-Freigabe,
  - Antwort auf DSGVO-Auskunftsersuchen.
- Wiederverwendbarer Helper `buildComplianceReportInput(document)` ergänzt.
- Compliance-PDFs nutzen den bestehenden `reports:generate`-IPC-Pfad.
- PDF-Exports werden weiterhin als verschlüsselte `.gsbvpdf`-Container gespeichert.
- Die Compliance-UI bietet nun getrennt:
  - `PDF erzeugen` für verschlüsselten Export,
  - `PDF abrufen` für Erzeugung und unmittelbares Öffnen als temporäre PDF-Arbeitskopie.

## Datenschutz-Hinweis

Beim Abruf eines verschlüsselten `.gsbvpdf`-Reports als PDF entsteht technisch eine temporäre Klartextkopie für den externen PDF-Viewer. Diese Logik ist bereits im Report-IPC gekapselt und löscht alte Preview-PDFs best-effort. Die vollständige Härtung von Auto-Lock und Preview-Cleanup bleibt Bestandteil des nächsten Security-Patches.

## Test

Neuer statischer Policy-Test:

```bash
npm run test:compliance-pdf-084c
```
