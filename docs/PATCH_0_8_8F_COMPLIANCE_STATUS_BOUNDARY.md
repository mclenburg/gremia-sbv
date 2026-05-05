# Patch 0.8.8-f – Compliance-Status fachlich begrenzen

## Ziel

Das Compliance Center darf keine organisatorischen oder menschlichen Entscheidungen per Ampel bewerten. Software darf nur technische Zustände bewerten, die sie selbst feststellen kann.

## Änderungen

- Gesamtampel entfernt.
- Technische Statuskarten bleiben erhalten, aber ohne DSGVO-Gesamturteil.
- Organisatorische Datenschutzthemen werden als neutrale Prüfpunkte angezeigt:
  - TOMs
  - VVT
  - DSFA
  - DSB-/IT-Security-Freigaben
  - organisatorischer Restore-Nachweis
- Neue Trennung im Modell:
  - `ComplianceTechnicalStatusItem`
  - `ComplianceManualCheckItem`
- Darkmode nutzt wieder dunkle SBV-Flächen.
- Lightmode erhält eigene helle Regeln.

## Produktregel

Die App bewertet technische Zustände. Die App erinnert an organisatorische Pflichten. Die App ersetzt keine DSB-, IT-Security- oder Rechtsprüfung.
