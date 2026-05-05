# Patch 0.8.6 – Arbeitsplatzgestaltung als Fallaktenmaßnahme

Dieser Patch baut den nächsten Schritt der fallaktenzentrierten Architektur aus. Die Arbeitsplatzgestaltung nach § 164 Abs. 4 SGB IX wird nicht als isolierte Parallelakte geführt, sondern als Maßnahme innerhalb der Fallakte.

## Kernpunkte

- neue Schema-Version `0021`
- neue Tabelle `case_measure_workplace_accommodation`
- neuer Service `WorkplaceAccommodationService`
- neue IPC-Brücke `workplaceAccommodation`
- Fallbaum zeigt Arbeitsplatzgestaltung unter „Maßnahmen“
- Fallakten-Footer enthält „Arbeitsplatz“
- Cockpit „Arbeitsplatzgestaltung“ dient nur Übersicht und Sprung in die Fallakte
- Inline-Befehle `/anp`, `/anpassung`, `/arbeitsplatz` legen aus dem Live-Protokoll eine Maßnahme an

## Produktregel

Die Fallakte bleibt der Ort der fachlichen Arbeit. Das Cockpit überwacht, das Overlay beschleunigt, Berichte werten aus.
