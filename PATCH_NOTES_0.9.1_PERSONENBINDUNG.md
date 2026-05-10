# Gremia.SBV 0.9.1 Personenbindung Patch

Dieses ZIP enthält ausschließlich geänderte oder neue Dateien und ist zum Entpacken im Projekt-Root gedacht.

Prüfung in dieser Umgebung:
- npm run source:cleanup: erfolgreich
- npm run build:readiness: erfolgreich
- npm run test -- --runInBand: nicht ausführbar, weil vitest/node_modules fehlen
- tsc -p tsconfig.json --noEmit: nicht aussagekräftig, weil Node-/Vitest-Typen und Dependencies fehlen

## Patch v5 - Migrationsreparatur fuer teilangewandte 0025

- `MigrationService.looksApplied('0025')` prueft nun auch die direkten Fallaktenbindungsspalten in `cases` sowie `privacy_review_items`.
- `repairKnownSchemaDrift()` repariert eine teilangewandte 0025-Migration auch dann, wenn `schema_migrations` die Version bereits als angewendet fuehrt.
- Fehlende Spalten `cases.protected_person_id`, `person_binding_state`, `privacy_review_required`, `privacy_review_reason`, `privacy_review_due_at`, `privacy_review_priority`, `anonymization_recommended` und `anonymized_at` werden idempotent nachgezogen.
- Die Reparatur ist bewusst additiv und loescht keine Fachdaten.
