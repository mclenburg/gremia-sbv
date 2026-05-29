# Datenbankmigrationen

## Grundsatz

Migrationen müssen idempotent, plattformunabhängig und datenverlustfrei sein. Sie dürfen keine Personen aus Freitexten erraten und keine Fallakten automatisch falsch verknüpfen.

## Schema- und Datenübernahmen

Bei Schemaänderungen und Datenübernahmen gelten folgende fachliche Leitplanken:

- `protected_persons` ist die zentrale Tabelle für das Personenverzeichnis,
- Importprofile und Importläufe speichern keine Rohdaten dauerhaft,
- Fallaktenbindung über `protected_person_id` ist das Zielmodell,
- vorhandene eindeutige Personen-Fall-Verknüpfungen dürfen übernommen werden,
- mehrdeutige oder fehlende Personenbezüge werden prüfpflichtig markiert,
- Privacy-Review-Status wird für Fallakten und Maßnahmen geführt,
- Audit-Log-Einträge enthalten keine Direktidentifikatoren.

## Migrationsregeln für Personenbindung

```text
Genau ein aktiver Personen-Fall-Link → eindeutige Personenbindung
Mehrere aktive Personen-Fall-Links → prüfpflichtiger Personenbezug / manuelle Auflösung
Kein Personen-Fall-Link → prüfpflichtiger Personenbezug / priorisierte Prüfung
```

Die technische Zustandsabbildung darf Fachanwenderinnen und Fachanwendern nicht als interne Enum-Bezeichnung angezeigt werden. In der UI sind sprechende Begriffe wie „ungeklärte Personenbindung“ oder „Datenschutzprüfung erforderlich“ zu verwenden.

## Tests

Migrationstests müssen prüfen:

- idempotente Ausführung,
- keine automatische Namensableitung aus Freitext,
- keine Datenlöschung ohne Bestätigung,
- korrekte Priorisierung prüfpflichtiger Fallakten,
- Plattformunabhängigkeit.
