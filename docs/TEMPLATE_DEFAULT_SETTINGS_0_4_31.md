# Gremia.SBV 0.4.31 – Vorlagen & Standardwerte

## Änderungen
- Einstellungen enthalten einen Bereich „Vorlagen & Standardwerte“.
- Allgemeine Platzhalter können gepflegt werden:
  - `{{sbv.name}}`
  - `{{sbv.funktion}}`
  - `{{sbv.email}}`
  - `{{sbv.telefon}}`
  - `{{sbv.signatur}}`
  - `{{arbeitgeber.ansprechpartner}}`
  - `{{arbeitgeber.personalabteilung}}`
  - `{{arbeitgeber.name}}`
  - `{{unternehmen.name}}`
  - `{{standort.name}}`
- Beim Erzeugen von Maßnahmendokumenten werden Standardwerte mit Fall- und Maßnahmewerten zusammengeführt.
- Fachliche Vorgangswerte überschreiben Standardwerte.

## Technischer Hinweis
Die UI nutzt eine optionale `templateDefaults`-Bridge, falls vorhanden. Bis die IPC-/DB-Seite vollständig angebunden ist, gibt es einen lokalen Fallback, damit die Oberfläche sofort nutzbar bleibt.
