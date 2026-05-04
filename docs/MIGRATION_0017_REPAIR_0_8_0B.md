# Gremia.SBV 0.8.0b – Reparatur Migration 0017

## Problem

Beim Öffnen eines verschlüsselten Tresors konnte die Migration `0017_termination_hearings.sql` mit folgendem Fehler abbrechen:

```text
no such column: status
```

Ursache: Ein früherer/teilweiser Migrationslauf konnte eine unvollständige Tabelle `termination_hearings` hinterlassen. `CREATE TABLE IF NOT EXISTS` repariert eine vorhandene unvollständige Tabelle nicht. Danach scheitert der Index auf `status`.

## Änderung

`0017_termination_hearings.sql` baut die Tabelle nun vor der Erstellung neu auf:

```sql
DROP TABLE IF EXISTS termination_hearings;
CREATE TABLE termination_hearings (... status TEXT NOT NULL DEFAULT 'eingang' ...)
```

Die Migration ist damit gegen den bekannten Teilzustand robust.

## Wichtig

Vor dem erneuten Öffnen des Tresors bitte das Backup der verschlüsselten Datenbank sichern. Da `0017` zuvor nicht erfolgreich abgeschlossen wurde, gilt eine vorhandene `termination_hearings`-Tabelle als unvollständiges Migrationsartefakt.
