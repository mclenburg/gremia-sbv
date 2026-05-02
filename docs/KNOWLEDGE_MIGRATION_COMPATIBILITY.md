# Wissensdatenbank-Migration: Kompatibilität

Version 0.4.4 behebt einen Altstand-Konflikt bei `case_legal_references`.

Vor der Wissensdatenbank existierte in frühen Datenbankschemata bereits eine Tabelle `case_legal_references` mit der Spalte `legal_reference_id`. Die neue Wissensdatenbank benötigt dagegen `legal_norm_id`.

Der Migration-Runner erkennt diesen Altstand jetzt automatisch:

- alte Tabelle wird nicht gelöscht,
- sie wird als `case_legal_references_legacy_<timestamp>` erhalten,
- die neue Tabelle `case_legal_references` wird mit `legal_norm_id` angelegt,
- der Migrationslauf 0013 kann danach sauber abgeschlossen werden.

Damit bleiben alte Datenbankstände startfähig, ohne dass der SQLCipher-Tresor neu angelegt werden muss.
