# SignPath-Code-Signatur für Windows-EXE-Artefakte

Diese Vorbereitung ist bewusst kostenneutral im normalen Entwicklungsbetrieb. Der Workflow wird weder bei Pull Requests noch bei Pushes noch bei Tags automatisch ausgeführt. Er ist ausschließlich manuell über `workflow_dispatch` startbar und zusätzlich über die Repository-Variable `SIGNPATH_ENABLED` gesperrt.

## Zielbild bei Repository-Publication

Wenn das Repository öffentlich gestellt wird, kann die Windows-EXE über SignPath signiert werden, ohne dass private Schlüssel im Repository oder in GitHub Actions abgelegt werden. SignPath stellt dafür den GitHub-Trusted-Build-Weg bereit: Der Build erzeugt ein GitHub-Artefakt, die SignPath-Action reicht dessen GitHub-Artefakt-ID an SignPath weiter, und SignPath prüft die Herkunft des Artefakts über GitHub-Metadaten.

## Dateien

- `.github/workflows/signpath-windows-exe.yml`
  - manueller, zusätzlich deaktivierter Workflow
  - keine Ausführung auf `push`, `pull_request`, `schedule` oder Tags
  - Read-only-Berechtigungen für `actions` und `contents`
- `.signpath/artifact-configurations/windows-exe.xml`
  - SignPath-Artefaktkonfiguration für ZIP-Uploads mit Windows-EXE-Dateien im ZIP-Wurzelverzeichnis
  - signiert ausschließlich PE/EXE-Dateien per Authenticode
- `scripts/check-signpath-readiness.cjs`
  - lokale Struktur- und Konfigurationsprüfung

## Freischaltungsschritte bei Repository-Publication

1. SignPath-Organisation vorbereiten.
2. SignPath-Projekt für Gremia.SBV anlegen.
3. GitHub.com als Trusted Build System in SignPath verknüpfen.
4. SignPath GitHub App für das Repository installieren.
5. Artifact Configuration `windows-exe` aus `.signpath/artifact-configurations/windows-exe.xml` in SignPath anlegen.
6. Signing Policy für Releases anlegen, zum Beispiel `release-signing`.
7. GitHub Repository Variables setzen:
   - `SIGNPATH_ENABLED=true`
   - `SIGNPATH_ORGANIZATION_ID=<SignPath Organization ID>`
   - `SIGNPATH_PROJECT_SLUG=<SignPath Project Slug>`
   - `SIGNPATH_SIGNING_POLICY_SLUG=<Signing Policy Slug>`
   - optional: `SIGNPATH_ARTIFACT_CONFIGURATION_SLUG=windows-exe`
8. GitHub Secret setzen:
   - `SIGNPATH_API_TOKEN=<SignPath API Token mit Submitter-Recht>`
9. Manuell den Workflow `Sign Windows EXE with SignPath` starten.

## Sicherheits- und Kostenlinie

Der Workflow verursacht keine laufenden GitHub-Actions-Kosten, solange er nicht manuell gestartet wird. Zusätzlich verhindert `SIGNPATH_ENABLED != true`, dass ein versehentlicher manueller Start einen Runner belegt. Das passt zur Big-Bang-Linie: vorbereitet, aber nicht aktiv, solange das Repository privat und noch nicht veröffentlicht ist.

## Prüfbefehl

```bash
node scripts/check-signpath-readiness.cjs
```

Mit aktivierter Umgebungsprüfung:

```bash
SIGNPATH_ENABLED=true \
SIGNPATH_API_TOKEN=dummy \
SIGNPATH_ORGANIZATION_ID=dummy \
SIGNPATH_PROJECT_SLUG=gremia-sbv \
SIGNPATH_SIGNING_POLICY_SLUG=release-signing \
node scripts/check-signpath-readiness.cjs --env
```

## Hinweis zur Electron-Signaturtiefe

Dieser vorbereitete Weg signiert die erzeugten Windows-EXE-Artefakte, die an SignPath übergeben werden. Für eine spätere vollständige Installer-Kette ist zu prüfen, ob zusätzlich innere App-Binaries vor dem finalen Installer-Packaging signiert werden müssen. Die erste Ausbaustufe ist bewusst auf die veröffentlichte EXE-Datei begrenzt, damit die Freischaltung schnell und kontrolliert erfolgen kann.
