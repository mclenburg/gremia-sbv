# Gremia.SBV 0.7.3 – Datenschutz- und Export-Härtung Kündigungsanhörung

## Ziel

Kündigungsanhörungen enthalten besonders sensible Beschäftigtendaten. 0.7.3 macht diese Sensibilität in der Oberfläche, im Exportprozess und in der Dokumentation sichtbar.

## Sensible Felder

Besonders kritisch sind:

- Schutzstatus
- Arbeitgebervortrag / Kündigungsgrund
- fehlende Unterlagen
- SBV-Bewertung
- SBV-Stellungnahme
- Stand / Entscheidung des Integrationsamts

Diese Felder können Gesundheitsdaten, Leistungsdaten, Verhaltensdaten, Konfliktdaten oder Informationen zum besonderen Kündigungsschutz enthalten.

## Umsetzung

### ExportGuard-Kontext

Beim Export von Kündigungsdokumenten wird nicht nur der gerenderte Text gescannt. Zusätzlich wird ein Kündigungs-spezifischer Kontext aufgebaut:

```text
buildTerminationExportContext(...)
terminationPrivacyExportNotice()
```

Damit erkennt der ExportGuard auch dann kritische Inhalte, wenn die Vorlage einzelne sensible Felder nur teilweise ausgibt.

### UI-Hinweis

Das Detailformular enthält einen Datenschutz-Hinweis:

```text
Kündigungsdaten sind vertraulich.
```

### Policy-Katalog

`services/terminationPrivacyPolicy.ts` klassifiziert sensible Kündigungsfelder und liefert die Export-Kontextdaten.

## Grundsatz

Exporte aus Kündigungsanhörungen dürfen nur zweckgebunden und mit minimal notwendigem Inhalt erfolgen.
