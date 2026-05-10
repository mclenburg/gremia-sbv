# Windows-Build

Stand: **0.9.1**

Der Windows-Build von Gremia.SBV erzeugt eine portable direkt startbare `.exe`. Ein NSIS-Installer ist nicht das Zielartefakt des RC-Releasepfads.

## Build

```bash
npm run build:win
```

## Erwartung

- Zielartefakt: portable `.exe`
- Release-Upload: nur `release/*.exe`
- keine verpflichtende Installation
- `requestedExecutionLevel`: `asInvoker`
- unsignierter RC-Build kann SmartScreen-Hinweise auslösen

## Tests

Der Windows-Build wird durch plattformunabhängige Tests abgesichert. Testcode darf keine POSIX-only-Pfade, keine harten Laufwerksannahmen und keine rohen LF/CRLF-Vergleiche verwenden.

## Abgrenzung

Ein späterer signierter Installer kann neu bewertet werden. Für 0.9.1 und 1.0 bleibt die portable EXE die passende Form, weil Gremia.SBV lokal, offline-first und perspektivisch portabel nutzbar sein soll.
