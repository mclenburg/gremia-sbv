# Patch 0.8.4a – harte Fehler und Einheitlichkeit

Dieser Patch stabilisiert die 0.8.4-Linie vor weiteren Fachfeatures. Ziel ist ein konsistenter Stand für frische und migrierte Tresore.

## Änderungen

- `package.json` und `package-lock.json` auf `0.8.4-a` angehoben.
- `scripts/generate-app-version.cjs` erzeugt die App-Version jetzt für Renderer und Services.
- Neue zentrale Service-Konstanten in `services/appSchema.ts`:
  - `APP_SCHEMA_VERSION = '0018'`
  - einheitliche Settings-Keys für Schema- und App-Version
  - zentrale Pflichtspalten für Kündigungsanhörungen und Audit-Log
- `MigrationService` nutzt keine hart codierte Altversion mehr.
- `BackupService` nutzt App- und Schema-Version zentral wiederverwendbar.
- Backup liest zuerst `database.schema.version` und nur noch kompatibel-fallbackend den alten Key `settings.database.schema.version`.
- Frische Datenbanken erhalten die neue Struktur von `termination_hearings` aus Migration `0017`.
- Der MigrationService repariert bekannte Schema-Drifts, wenn Migrationen als erledigt markiert wurden, die konkrete Tabellenstruktur aber unvollständig ist.
- `termination_hearing` ist in `App.tsx` als implementierte View registriert.

## Datenschutz-/Stabilitätsnutzen

- Backups tragen die reale App- und Schema-Version.
- Restore-Warnungen prüfen gegen den zentralen Schema-Stand `0018`.
- Frischinstallationen und migrierte Datenbanken laufen nicht mehr auseinander.
- Der harte Fehler `no such column: status` bei Kündigungsanhörungen wird auch bei bekannten Drift-Zuständen abgefangen.

## Tests

Ergänzt wurde `tests/versionSchemaConsistency084a.test.ts`. Bestehende Policy-Tests zu Backup- und Migrationshärtung wurden auf die zentrale Versionierung angepasst.
