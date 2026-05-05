# Patch 0.8.5-c – Berichtskatalog und Systemberichte

## Ziel

Das Berichtsmodul wurde wieder als vollständiger Berichtskatalog hergestellt. Vorher war in der UI praktisch nur der Tätigkeitsbericht sichtbar. Ab 0.8.5-c können SBV-Fachberichte, Datenschutzberichte und Systemberichte zentral über den bestehenden verschlüsselten PDF-Report-Service erzeugt und geöffnet werden.

## Neue bzw. wieder sichtbare Berichte

### SBV-Fachberichte

- Tätigkeitsbericht der SBV
- Fall- und Fristen-Controlling
- BEM- und Präventionsbericht
- SBV-Beteiligungsbericht nach § 178 Abs. 2 SGB IX
- Kündigungsanhörungsbericht
- Gleichstellungs- und GdB-Bericht

### Datenschutz und Compliance

- Datenschutz-Audit
- Lösch- und Aufbewahrungsbericht

### Systemberichte

- Audit-Log- und Zugriffsbericht mit Hash-Chain-Auswertung
- System- und Integritätsbericht

## Datenschutzgrundsatz

Berichte werden weiterhin als verschlüsselte `.gsbvpdf`-Container erzeugt. Beim Öffnen wird temporär eine Klartext-Arbeitskopie erstellt, die über den zentralen Sicherheits-/TempFile-Mechanismus verwaltet wird.

Der Tätigkeitsbericht wurde aktualisiert und enthält keine Namen, Aktenzeichen, Diagnosen, Dokumenttitel oder vertraulichen Freitexte. Bei kleinen Fallzahlen wird weiterhin auf mögliche Rückrechenbarkeit hingewiesen.

## Technische Änderungen

- `REPORT_TYPES` erweitert.
- `ReportDescriptor` um optionale Gruppierung erweitert.
- `ReportService` um neue Berichtsgeneratoren ergänzt.
- Kündigungsbericht auf aktuelle Schema-0019-Spaltenstruktur umgestellt.
- `ReportsView` vollständig neu als Berichtskatalog aufgebaut.
- Responsive CSS für Katalog, Detailbereich und Historie ergänzt.

## Test

```bash
npm run test:reports-085c
```
