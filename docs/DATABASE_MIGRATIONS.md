# Datenbankmigrationen

Stand: **0.9.1**

## Grundsatz

Migrationen müssen idempotent, plattformunabhängig und datenverlustfrei sein. Sie dürfen keine Personen aus Freitexten erraten und keine Fallakten automatisch falsch verknüpfen.

## 0.9.1-Migrationsschwerpunkte

- `protected_persons` für Personenverzeichnis,
- Importprofile und Importläufe ohne Rohdaten,
- Fallaktenbindung über `protected_person_id` als Zielmodell,
- Auswertung vorhandener `person_case_links`,
- Legacy-Fälle mit Priorisierung statt Prüfflut,
- Privacy-Review-Status für Fallakten und Maßnahmen,
- Audit-Log ohne Direktidentifikatoren.

## Migrationsregeln

```text
Genau ein aktiver person_case_link → migrated
Mehrere aktive person_case_links → legacy_unlinked / manuelle Auflösung
Kein Link → legacy_unlinked / priorisierte Prüfung
```

## Tests

Migrationstests müssen prüfen:

- idempotente Ausführung,
- keine automatische Namensableitung aus Freitext,
- keine Datenlöschung ohne Bestätigung,
- korrekte Priorisierung abgeschlossener Altakten,
- Plattformunabhängigkeit.
