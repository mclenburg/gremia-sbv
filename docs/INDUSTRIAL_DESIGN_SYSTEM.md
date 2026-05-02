# Gremia.SBV Industrial Design System

Stand: 0.3.12

## Grundsatz

Die Oberfläche ist kein Marketing-Auftritt, sondern ein Arbeitsinstrument. Die Designsprache ist bewusst kompakt, dunkel, kantig und technisch:

- grauschwarze Grundflächen
- gelbe Akzentlinien und Statusmarkierungen
- keine weichen Card-/Pill-Rundungen
- monospaced Micro-Labels
- klare Modulrahmen
- Tabellen und Register in identischer Panel-Optik

## Zentrale CSS-Klassen

- `industrial-shell` – Hintergrundraster und Grundfläche
- `industrial-sidebar` – linke Navigation
- `industrial-topbar` – Kopfzeile des Arbeitsbereichs
- `industrial-panel` – Standardcontainer für Module
- `industrial-module-header` – Modulüberschrift
- `industrial-card` – klickbare Dashboard-Kachel
- `industrial-deadline-card` – Fristenkarte
- `industrial-table` / `industrial-table-shell` – Register- und Listenansichten
- `industrial-form` – kompakte Eingabeformulare
- `industrial-button` – primäre Aktion
- `industrial-danger-button` – destruktive Aktion
- `industrial-status-badge` – Status-/Schweregrad-Kennzeichnung

## Regel

Neue Module sollen keine `rounded-*`, `bg-slate-*` oder weichen Pastellflächen mehr verwenden. Stattdessen werden die zentralen Industrial-Komponenten verwendet, damit sich BEM, Fälle, Fristen, Einstellungen, Vorlagen, Kontakte und Berichte wie ein zusammenhängendes Werkzeug anfühlen.
