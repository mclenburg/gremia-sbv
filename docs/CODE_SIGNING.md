# Code-Signing-Strategie

Stand: **0.9.2 / 1.0-RC**

## Ausgangspunkt

Gremia.SBV wird zum öffentlichen 1.0-Start als nachvollziehbarer Community-Build veröffentlicht. Die Build-Artefakte sind zunächst nicht kommerziell signiert und macOS-Artefakte sind zunächst nicht notarisiert.

Das ist transparent zu dokumentieren, weil Betriebssysteme bei nicht signierten Desktop-Artefakten warnen können:

- Windows: SmartScreen-Hinweise bei portabler EXE,
- macOS: Gatekeeper-/Notarisierungswarnungen,
- Linux AppImage: keine Signaturprüfung durch den Desktop-Standard, aber weiterhin Download-Vertrauen erforderlich.

## 1.0-Mindeststrategie

Für 1.0 gilt:

1. README und Release-Notes weisen prominent auf den unsignierten Status hin.
2. Build-Artefakte entstehen reproduzierbar aus GitHub Actions.
3. Drittanbieter-Lizenzen werden als `THIRD_PARTY_LICENSES.txt` erzeugt und mit ausgeliefert.
4. Sicherheitslücken werden über `SECURITY.md` vertraulich gemeldet.
5. Signierte Artefakte werden als Ziel für die 1.x-Linie geführt.

## 1.x-Zielbild

Für die 1.x-Linie ist vorgesehen:

- Windows-Code-Signing-Zertifikat beschaffen,
- Windows-Signing in GitHub Actions über Secrets einbinden,
- macOS Developer-ID und Notarisierung prüfen,
- Build-Workflow so erweitern, dass signierte Artefakte und Checksummen gemeinsam veröffentlicht werden,
- README und Release-Notes nach erfolgreicher Einführung aktualisieren.

## Bewusste Abgrenzung

Ein nicht signierter Build ist kein Freibrief für unklare Herkunft. Nutzerinnen und Nutzer sollen Releases ausschließlich aus dem offiziellen Repository beziehen und keine Dateien aus Drittquellen verwenden.
