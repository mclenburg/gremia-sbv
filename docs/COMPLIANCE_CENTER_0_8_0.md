# Gremia.SBV 0.8.0 – Compliance Center

## Ziel

0.8.0 ergänzt ein aktives Compliance Center. Die SBV kann auf Knopfdruck folgende Unterlagen erzeugen:

- TOMs – Technische und organisatorische Maßnahmen
- DSFA-Entwurf nach Art. 35 DSGVO
- DSGVO-/BDSG-Compliance-Auswertung
- Freigabeformular für Datenschutzbeauftragte und IT-Security

## Umsetzung

### Modul

```text
src/app/features/compliance/ComplianceView.tsx
```

### Service

```text
services/complianceCenterService.ts
```

### Modell

```text
src/app/core/models/compliance.model.ts
```

## Ausgabe

Die Unterlagen werden als Markdown erzeugt, in der App angezeigt und können als `.md` exportiert werden.

## Inhaltlicher Grundsatz

Die Unterlagen behaupten keine automatische DSGVO-Konformität. Sie dokumentieren die technischen und organisatorischen Maßnahmen und unterstützen die interne Bewertung durch DSB, IT-Security und Verantwortliche.

## 1.0-Relevanz

Das Compliance Center ist ein Freigabe- und Nachweiswerkzeug für den produktiven Einsatz von Gremia.SBV.
