# Windows-Builds für Gremia.SBV

Ab Version 0.3.23 kann Gremia.SBV zusätzlich als Windows-Anwendung gebaut werden.

## Zielartefakte

Der Windows-RC-Build erzeugt ein Release-Artefakt unter `release/`:

1. **portable Direktstart-EXE als EXE**  
   Geeignet für normale Installation im Benutzerprofil. Der portable EXE benötigt keine Administratorrechte, weil `perMachine: false` gesetzt ist. Für GitHub-Releases wird nur diese EXE hochgeladen; zusätzliche ZIP-, Blockmap- oder Update-Metadaten-Artefakte gehören nicht in den RC-Release.

## Build unter Windows

Empfohlen ist der Build direkt auf Windows, weil native Electron-Module wie `better-sqlite3-multiple-ciphers` zur Electron-/Windows-ABI passen müssen.

Voraussetzungen:

- Node.js LTS
- npm
- Git Bash oder PowerShell
- Visual Studio Build Tools mit C++-Toolchain, falls native Module neu gebaut werden müssen

Dann im Projektordner:

```bash
npm install
npm run native:rebuild:electron
npm run build:win
```

## Build unter Linux

Ein Windows-Build unter Linux ist möglich, kann aber Wine/Mono benötigen:

```bash
sudo apt update
sudo apt install -y wine64 mono-complete
npm install
npm run native:rebuild:electron
npm run build:win
```

Wenn der Windows-Build auf Linux wegen nativer Module oder Signierung scheitert, ist das kein App-Fehler. Dann den Windows-Build auf einem Windows-Rechner oder in einer Windows-CI ausführen.

## Starten der Windows-Version

Nach dem Build liegen die Dateien unter:

```text
release/
```

Der portable EXE richtet Startmenü- und Desktop-Verknüpfungen ein. Eine gesonderte portable EXE wird im RC-Release nicht mehr erzeugt oder hochgeladen.

## Datenschutz und Datenablage

Auch unter Windows gilt:

- Die Datenbank ist SQLCipher-verschlüsselt.
- Eine kopierte Datenbankdatei ist ohne passenden Schlüssel nicht lesbar.
- Ein gelöschtes Manifest darf keinen Zugriff auf vorhandene Daten erlauben.
- Für produktive Nutzung sollte der Datenpfad bewusst gewählt werden, insbesondere bei USB-Stick-Betrieb.

Für spätere Version vorgesehen:

```text
GREMIA_SBV_DATA_DIR=E:\GremiaSBV\data
```

oder eine grafische Auswahl in den Einstellungen.

## Keine automatische Cloud-Anbindung

Der Windows-Build enthält keine Cloud-Synchronisation, keine Telemetrie und keine automatische Verbindung zu Gremia.BR. Eine spätere Gremia.BR-Schnittstelle bleibt rein lesend und muss ausdrücklich aktiviert werden.


## Portable EXE statt Installer

Für Gremia.SBV wird unter Windows eine portable, direkt startbare EXE gebaut. Das passt zur Offline- und USB-Nutzung der SBV-Anwendung. Der Build verwendet `--win portable --x64`; es wird kein Installer als primäres RC-Artefakt erzeugt.
