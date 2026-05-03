# Gremia.SBV 0.5.4 – Migration Hardening

## Ziel

0.5.4 stabilisiert den Datenbankpfad vor den nächsten Fachmodulen.

## Änderungen

### Schema-Version

- `APP_SCHEMA_VERSION` steht jetzt auf `0015`.
- `APP_VERSION` im MigrationService steht auf `0.5.4`.

### Migration 0015 / BEM

- Bereits korrekt vorhandene BEM-Strukturen werden als angewendet erkannt.
- Defekte frühe BEM-Tabellen werden nicht aus unbekannten Spalten importiert.
- Eine vorhandene frühe Tabelle wird als `bem_processes_legacy_0500` gesichert.
- Die neue BEM-Struktur wird danach sauber angelegt.

### Schema-Validierung

Nach Migrationen prüft der MigrationService zentrale Tabellen und Pflichtspalten. Fehlt etwas, wird die Datenbank nicht stillschweigend geöffnet, sondern mit konkreter Diagnose abgewiesen.

### Diagnose

Die Fehlermeldung beim Entsperren unterscheidet jetzt besser zwischen:

- Migration / Schemafehler,
- falschem Passwort / falschem Manifest / kopierter Datenbank,
- beschädigter oder nicht lesbarer Datenbankdatei.

## Nächster Schritt

Nach 0.5.4 sollte ein wiederverwendbares Maßnahmen-Framework folgen, damit Prävention, BEM, Kündigung und Gleichstellung nicht auseinanderlaufen.

## Frischinstallation

`database/schema.sql` wurde auf das aktuelle BEM-Schema angehoben, damit neue Tresore nicht mehr mit dem alten BEM-0.2-Schema starten.
