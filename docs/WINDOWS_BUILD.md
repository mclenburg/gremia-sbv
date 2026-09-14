# Windows-Build

Der Windows-Release-Build von Gremia.SBV erzeugt zwei Endanwender-Artefakte: eine portable direkt startbare `.exe` und zusätzlich ein natives MSI-Paket. Die portable Variante bleibt vollständig erhalten; die MSI-Datei ersetzt den bisherigen NSIS-Installer im GitHub-Release und eignet sich insbesondere für eine reguläre bzw. administrierte Windows-Installation.

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

- Zielartefakte des Release-Builds: `Gremia.SBV-<version>-win-x64-portable.exe` und `Gremia.SBV-<version>-win-x64.msi`
- Upload: genau diese beiden Windows-Endanwender-Artefakte
- Installation bleibt optional; die portable Variante wird weiterhin angeboten
- die MSI-Datei ist das native Windows-Installerformat für verwaltete Bereitstellung
- `requestedExecutionLevel`: `asInvoker` bleibt für die portable EXE unverändert
- bei nicht signierten Artefakten können Windows-Sicherheitswarnungen auftreten

## Tests

Der Windows-Build wird durch plattformunabhängige Tests abgesichert. Testcode darf keine POSIX-only-Pfade, keine harten Laufwerksannahmen und keine rohen LF/CRLF-Vergleiche verwenden.

## Abgrenzung

Portable EXE und MSI sind Release-Artefakte mit unterschiedlichen Bereitstellungsprofilen. Die portable EXE benötigt keine Installation und bleibt der direkt startbare Build. Die MSI-Datei ist für die installierte Nutzung und insbesondere für typische Windows-Deployment-Werkzeuge vorgesehen.

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

Die Artefaktprüfung verlangt portable EXE und MSI. Der Startup-Smoke startet bewusst nur die portable EXE mit einem isolierten Pfad, der Leerzeichen, Umlaute und einen langen Pfadabschnitt enthält; die MSI-Datei wird als OLE/Compound-File-Artefakt anhand von Name, Frische, Mindestgröße und Binärsignatur verifiziert. Anschließend werden Backup und Restore in derselben Pfadklasse geprüft.
