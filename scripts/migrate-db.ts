console.log('Gremia.SBV Datenbankmigrationen laufen automatisch beim Entsperren der App.');
console.log('Der SQLCipher-Tresor wird erst nach erfolgreicher Passworteingabe geöffnet; danach führt der MigrationService fehlende Migrationen aus.');
console.log('Zur Kontrolle in der entsperrten Datenbank: SELECT * FROM schema_migrations ORDER BY version;');
