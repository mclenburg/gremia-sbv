# Windows-Build

Stand: **0.9.1**

Der Windows-Build von Gremia.SBV erzeugt eine portable direkt startbare `.exe` und kein Installer. Ein Windows-Installer ist nicht das Zielartefakt des RC-Releasepfads.

## Build

```bash
npm run build:win
```

## Erwartung

- Zielartefakt: portable `.exe`
- Release-Upload: nur `release/*.exe`
- Für GitHub-Releases wird nur diese EXE hochgeladen
- keine verpflichtende Installation
- `requestedExecutionLevel`: `asInvoker`
- unsignierter RC-Build kann SmartScreen-Hinweise auslösen

## Tests

Der Windows-Build wird durch plattformunabhängige Tests abgesichert. Testcode darf keine POSIX-only-Pfade, keine harten Laufwerksannahmen und keine rohen LF/CRLF-Vergleiche verwenden.

## Abgrenzung

Ein späterer signierter Installer kann neu bewertet werden. Für 0.9.1 und 1.0 bleibt die portable EXE die passende Form, weil Gremia.SBV lokal, offline-first und perspektivisch portabel nutzbar sein soll.


## 0.9.1 RC-Artefaktvertrag

Für Windows wird ausschließlich eine portable x64-EXE gebaut. Ein Installer/NSIS-Artefakt ist für Gremia.SBV 0.9.1 nicht zulässig, weil die Anwendung offline-first und portabel nutzbar bleiben muss.

Prüfung:

```bash
npm run build:win
```

Erwartet wird genau das portable Endnutzerartefakt im Release-Verzeichnis.
