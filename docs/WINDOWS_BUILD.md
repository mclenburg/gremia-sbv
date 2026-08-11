# Windows-Build

Der Windows-Build von Gremia.SBV erzeugt eine portable direkt startbare `.exe` und keinen verpflichtenden Installer.

## Build

Für den normalen Windows-Build:

```bash
npm run build:win
```

Für die lokale Abnahme mit derselben Plattformsequenz wie im GitHub-Build:

```bash
npm run build:github
```

Dieser Lauf umfasst zusätzlich die Windows-Artefaktprüfung, den Start-Smoke-Test und den Backup/Restore-Plattformcheck.

## Erwartung

- Zielartefakt: portable `.exe`
- Upload: nur `release/*.exe`
- keine verpflichtende Installation
- `requestedExecutionLevel`: `asInvoker`
- bei nicht signierten Artefakten können SmartScreen-Hinweise auftreten

## Tests

Der Windows-Build wird durch plattformunabhängige Tests abgesichert. Testcode darf keine POSIX-only-Pfade, keine harten Laufwerksannahmen und keine rohen LF/CRLF-Vergleiche verwenden.

## Abgrenzung

Ein signierter Installer kann gesondert bewertet werden. Für öffentliche Community-Artefakte bleibt die portable EXE die passende Form, weil Gremia.SBV lokal, offline-first und portabel nutzbar bleiben soll.

## Portable Datenhaltung und Plattformabnahme

Bei einer durch electron-builder gestarteten Portable-EXE verwendet Gremia.SBV standardmäßig
`Gremia.SBV-Daten` neben der gestarteten EXE. `GREMIA_SBV_DATA_DIR` bleibt als ausdrücklich gesetzte
administrative oder testbezogene Vorgabe vorrangig. Ohne Portable-Kontext verwendet ein paketierter
Build weiterhin das Electron-`userData`-Verzeichnis unter AppData.

Die Windows-CI führt auf `windows-latest` real aus:

```text
npm ci
native:diagnose
build:verify
build:compile
build:package:windows
release:platform:windows
```

Der Plattformcheck startet die portable EXE mit einem isolierten Pfad, der Leerzeichen, Umlaute und
einen langen Pfadabschnitt enthält. Anschließend werden Backup und Restore in derselben Pfadklasse geprüft.
