# Prozessmodule und Maßnahmenlogik

Stand: **0.9.1**

## Grundsatz

Prozessmodule schreiben die Fallakte fort. Sie ersetzen keine rechtliche Bewertung und keine menschliche Entscheidung der SBV.

## Module

- BEM,
- Prävention,
- Beteiligung,
- Kündigung,
- Gleichstellung / GdB-Beratung,
- Arbeitsplatzgestaltung,
- Fristen und Wiedervorlagen,
- Personenverzeichnis und Schutzstatus.

## Personenbezug

Reguläre Prozessmaßnahmen gehören über die Fallakte zu genau einer Person. Bei anonymer Anfrage ist nur ein pseudonymer Personenstamm zulässig. Maßnahmen dürfen keinen parallelen Personenbezug speichern, wenn der Bezug über `CaseFile → ProtectedPerson` ableitbar ist.

## Speicherung großer Textfelder

Große Textfelder und Textareas in Maßnahmen speichern auf Lost Focus. Inline-Kommandos bleiben aktiv und nutzen die bestehende Kommandoerkennung.

## Datenschutz-Lifecycle

Statusablauf, Beschäftigungsende, Anonymisierung oder Löschung der Person markieren verbundene Maßnahmen zur Datenschutzprüfung. Freitexte werden nicht automatisch anonymisiert. Maßnahmennotizen sind als eigene fall- und maßnahmengebundene Freitexte Teil dieses Prüfpfads.
