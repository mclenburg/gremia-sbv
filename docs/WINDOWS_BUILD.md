# Windows-Build

Der Windows-Build von Gremia.SBV erzeugt zwei Endanwender-Artefakte: eine portable direkt startbare `.exe` und zusätzlich einen NSIS-Installer. Die portable Variante bleibt vollständig erhalten; der Installer ist die empfohlene Variante, wenn ein schnellerer regulärer Programmstart ohne Portable-Self-Extract-Overhead gewünscht ist.

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

- Zielartefakte: `Gremia.SBV-<version>-win-x64-portable.exe` und `Gremia.SBV-<version>-win-x64-setup.exe`
- Upload: beide Endanwender-EXEs aus `release/*.exe`
- Installation bleibt optional; die portable Variante wird weiterhin angeboten
- `requestedExecutionLevel`: `asInvoker`
- bei nicht signierten Artefakten können SmartScreen-Hinweise auftreten

## Tests

Der Windows-Build wird durch plattformunabhängige Tests abgesichert. Testcode darf keine POSIX-only-Pfade, keine harten Laufwerksannahmen und keine rohen LF/CRLF-Vergleiche verwenden.

## Abgrenzung

Portable EXE und Installer sind gleichwertige Release-Artefakte mit unterschiedlichen Start-/Bereitstellungsprofilen. Die portable EXE benötigt keine Installation, kann wegen des Self-Extract-Wrappers aber vor dem Electron-Splash deutlich länger benötigen. Der Installer beseitigt diesen Wrapper-Startweg für regulär installierte Nutzung.

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

Die Artefaktprüfung verlangt beide Windows-Endanwender-EXEs. Der Startup-Smoke startet bewusst die portable EXE mit einem isolierten Pfad, der Leerzeichen, Umlaute und einen langen Pfadabschnitt enthält; der Installer wird als PE-Artefakt, Name, Frische und Größe verifiziert. Anschließend werden Backup und Restore in derselben Pfadklasse geprüft.
