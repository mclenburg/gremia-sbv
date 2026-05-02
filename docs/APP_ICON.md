# App-Icon

Gremia.SBV verwendet ab Version 0.3.25 ein eigenes Industrial-App-Icon.

## Dateien

```text
assets/icons/source/industrial-security-badge.png   # Ausgangsbild, 1024x1024
assets/icons/icon.png                               # Standard-PNG für Builder/Dev
assets/icons/icon.ico                               # Windows-Icon
assets/icons/png/16x16.png ... 1024x1024.png        # Linux-/Desktop-Icongrößen
```

## Build-Einbindung

Die `electron-builder`-Konfiguration verweist jetzt auf:

```json
"build": {
  "icon": "assets/icons/icon.png",
  "linux": {
    "icon": "assets/icons/png"
  },
  "win": {
    "icon": "assets/icons/icon.ico"
  }
}
```

Zusätzlich wird das Icon im Entwicklungsmodus über `BrowserWindow.icon` gesetzt.

## Neu bauen

Linux:

```bash
rm -rf dist dist-electron release
npm run build:linux
```

Windows:

```bash
rm -rf dist dist-electron release
npm run build:win
```

Wenn unter Linux der Starter bereits existiert, nach dem Build neu anlegen:

```bash
npm run launcher:linux
```

## Hinweis

Bei Windows kann es vorkommen, dass Explorer und Taskleiste alte Icons cachen. Dann die alte portable EXE löschen, die neue EXE mit anderem Namen starten oder den Windows-Iconcache aktualisieren.
