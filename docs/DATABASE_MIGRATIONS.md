# Datenbankmigrationen

Gremia.SBV migriert den SQLCipher-Tresor beim Entsperren automatisch.

## Ziel

Eine neuere App-Version darf nicht voraussetzen, dass SQL-Dateien manuell ausgeführt werden. Beim Start muss die App erkennen:

- ob die Datenbank frisch ist,
- welche Migrationen bereits gelaufen sind,
- welche Tabellen, Spalten oder Indizes aus älteren Versionen fehlen,
- welche Migrationen nachgezogen werden müssen.

## Technische Umsetzung

Der `MigrationService` führt beim Öffnen der verschlüsselten Datenbank aus:

1. `schema_migrations` und `schema_migration_log` defensiv anlegen,
2. bei frischer Datenbank `database/schema.sql` einspielen,
3. vorhandene Altstände anhand konkreter Tabellen, Spalten und Indizes erkennen,
4. erkannte Migrationen nachträglich als `inferred` markieren,
5. fehlende Migrationen sortiert aus `database/migrations/*.sql` anwenden,
6. `settings.database.schema.version` aktualisieren.

## Warum nicht einfach alle SQL-Dateien erneut ausführen?

Einige alte Migrationen enthalten `ALTER TABLE ... ADD COLUMN`. SQLite kann dieselbe Spalte nicht zweimal hinzufügen. Darum führt der Runner solche Spaltenerweiterungen sicher aus: erst prüfen, ob Tabelle und Spalte existieren, dann nur fehlende Spalten ergänzen.

## Migrationstabelle

```sql
SELECT * FROM schema_migrations ORDER BY version;
SELECT * FROM schema_migration_log ORDER BY created_at DESC;
```

Wichtige Modi:

- `baseline`: frische Datenbank wurde direkt mit aktuellem `schema.sql` initialisiert,
- `inferred`: Migration war bereits strukturell vorhanden und wurde nachträglich markiert,
- `sql`: Migration wurde tatsächlich ausgeführt.

## Datenschutz/Sicherheit

Migrationen laufen erst nach erfolgreicher Entsperrung des SQLCipher-Tresors. Eine kopierte Datenbankdatei bleibt ohne passenden Schlüssel unlesbar; Migrationen umgehen den Tresorschutz nicht.

## Regel für neue Versionen

Jede strukturelle Änderung bekommt künftig eine neue nummerierte Datei:

```text
0010_name_der_aenderung.sql
0011_naechste_aenderung.sql
```

Zusätzlich sollte `database/schema.sql` für Neuinstallationen auf den aktuellen Stand gebracht werden.
