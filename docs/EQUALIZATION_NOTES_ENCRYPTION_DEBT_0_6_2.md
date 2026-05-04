# Gremia.SBV 0.6.2 – Technischer Schuldposten: Gleichstellungsnotizen

## Einordnung

Das Gleichstellungs-/GdB-Modul speichert `agencyReference` und `objectionDueAt` als strukturierte Metadaten. Das ist vertretbar, weil diese Felder isoliert regelmäßig nicht aussagekräftig genug sind, um konkrete Gesundheitsdaten offenzulegen.

Das Feld `notes` ist anders zu bewerten: Dort können schnell Gesundheitsdaten, GdB-Angaben, Bescheidinhalte, Diagnosen oder Arbeitsplatzrisiken landen. Diese Inhalte können besondere Kategorien personenbezogener Daten im Sinne von Art. 9 DSGVO berühren.

## Aktueller Stand

`equalization_processes.notes` ist aktuell ein normales Datenbankfeld und nicht gesondert wie Fallnotizen behandelt.

## Bewertung

Kein akuter Blocker für die Entwicklung, aber ein klarer technischer Schuldposten vor 1.0.

## Ziel vor 1.0

- entweder Gleichstellungsnotizen in die bestehende Fallnotiz-Logik überführen,
- oder feldbezogene Verschlüsselung für `equalization_processes.notes` ergänzen,
- und ExportGuard/Backup/Restore entsprechend testen.

## Regel bis zur Umsetzung

In `notes` nur das fachlich Erforderliche dokumentieren. Diagnosen und detaillierte Gesundheitsangaben vermeiden, soweit sie für die SBV-Arbeit nicht zwingend erforderlich sind.
