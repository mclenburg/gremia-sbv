# Windows-Build

Der Windows-Build von Gremia.SBV erzeugt eine portable direkt startbare `.exe` und keinen verpflichtenden Installer.

## Build

```bash
npm run build:win
```

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
