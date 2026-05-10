# App-Version und Build-Metadaten

Stand: **0.9.1**

## Version

Die Paketversion in `package.json` ist die führende Versionsquelle. Generierte Dateien müssen synchron sein:

- `src/app/generated/appVersion.ts`,
- `services/generated/appMetadata.ts`,
- README und Roadmap.

## Generierung

```bash
npm run version:generate
```

`pretest`, `predev` und `prebuild` rufen die Versionsgenerierung automatisch auf.

## Tests

Versions-Tests dürfen nicht hart auf historische Hotfix-Suffixe pinnen. Sie müssen dynamisch gegen `package.json` prüfen.
