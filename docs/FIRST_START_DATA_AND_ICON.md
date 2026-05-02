# Erststart, Datenablage und App-Icon

## Erststart

Gremia.SBV legt den Datenbereich beim Start selbst an. Im Entwicklungsmodus ist das standardmäßig `./data`, im gepackten AppImage bzw. in der installierten App ist es `app.getPath('userData')/data`, unter Linux also typischerweise:

```text
~/.config/Gremia.SBV/data
```

Beim ersten Start werden diese Verzeichnisse angelegt:

```text
data/
data/documents/
data/backups/
data/exports/
data/tmp/
```

Der SQLCipher-Tresor entsteht erst beim Einrichten des Initialpassworts:

```text
data/gremia-sbv.vault.sqlite
data/security.json
data/vault-manifest.json
```

Leere Systemordner gelten nicht als vorhandener Datenbestand. Dadurch bleibt der echte Erststart weiterhin sauber im Setup-Modus.

## Portabler Modus

Für USB-Stick-Betrieb kann der Datenbereich fest vorgegeben werden:

```bash
GREMIA_SBV_DATA_DIR="/media/$USER/USB/Gremia.SBV-data" ./Gremia.SBV-*.AppImage
```

## App-Icon

Das App-Icon wird jetzt doppelt eingebunden:

1. über `electron-builder` für Installer/AppImage/EXE,
2. zur Laufzeit über `BrowserWindow.icon`.

Die Icon-Dateien werden zusätzlich als `extraResources` außerhalb der ASAR-Datei ins Paket kopiert, damit Linux/Electron sie zuverlässig als Fenster-Icon laden kann.

Falls die Taskleiste nach einem Update noch das alte Zahnrad zeigt, liegt das häufig am Desktop-Cache. Dann Launcher neu erzeugen und ggf. neu anmelden:

```bash
npm run launcher:linux
gtk-update-icon-cache ~/.local/share/icons/hicolor 2>/dev/null || true
```
