# App-Version und Build-Metadaten

## Version

Die Paketversion in `package.json` ist die führende Versionsquelle. Generierte Dateien müssen synchron sein:

- `src/app/generated/appVersion.ts`,
- `services/generated/appMetadata.ts`,
- generierte Metadatendateien.

## Generierung

```bash
npm run version:generate
```

`pretest`, `predev` und `prebuild` rufen die Versionsgenerierung automatisch auf.

## Tests

Versions-Tests prüfen dynamisch gegen `package.json` und dürfen keine manuell gepflegten Dokumentationsstände voraussetzen.
