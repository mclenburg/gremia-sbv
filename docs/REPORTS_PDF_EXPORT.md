# Gremia.SBV 0.3.33 – Berichte und PDF-Export

Dieses Paket ergänzt das Modul **Berichte**.

## Enthaltene Berichtstypen

- Tätigkeitsbericht der SBV
- Datenschutz-Audit
- Fall- und Fristen-Controlling
- BEM- und Präventionsbericht
- Kündigungsanhörungsbericht
- System- und Integritätsbericht

## Datenschutzlogik

Der Tätigkeitsbericht ist als anonymisierter Bericht angelegt und gibt keine Aktenzeichen, Namen oder Gesundheitsdetails aus. Interne Prüfberichte können operative Daten enthalten und bleiben als **intern vertraulich** gekennzeichnet.

## PDF-Ausgabe

PDFs werden lokal erzeugt und im Datenbereich gespeichert:

```text
<data-dir>/exports/
```

Im AppImage ist das standardmäßig:

```text
~/.config/Gremia.SBV/data/exports/
```

Im portablen Modus liegt der Exportordner unter dem per `GREMIA_SBV_DATA_DIR` gesetzten Datenpfad.

## Technische Umsetzung

Die PDF-Erzeugung erfolgt offline über Electron `printToPDF`. Es gibt keine Cloud-Abhängigkeit, keine externen Fonts und keinen Netzwerkzugriff.

## Migration

Neue Migration:

```text
database/migrations/0010_reports.sql
```

Die Tabelle `report_exports` speichert die Exporthistorie, nicht den kompletten PDF-Inhalt.
