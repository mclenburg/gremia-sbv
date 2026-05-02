# App-Version in der Oberfläche

Die in der Oberfläche links unten angezeigte Versionsnummer wird nicht mehr manuell in `App.tsx` gepflegt.

Stattdessen erzeugt das Script

```bash
npm run version:generate
```

aus der `package.json` die Datei:

```text
src/app/generated/appVersion.ts
```

Die App importiert daraus `APP_VERSION`.

## Automatische Ausführung

Das Script läuft automatisch vor:

```bash
npm run dev
npm run test
npm run build
```

Damit übernehmen auch `npm run build:linux` und `npm run build:win` die aktuelle Version, weil beide intern `npm run build` verwenden.

## Regel

Die Versionsnummer wird nur noch in `package.json` geändert. Die UI zieht sie beim nächsten Dev-/Test-/Build-Lauf automatisch nach.
