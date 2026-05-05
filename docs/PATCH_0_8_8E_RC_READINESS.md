# Patch 0.8.8-e – RC-Readiness und ruhiger Source-Cleanup

## Ziel

Nach der Testbereinigung soll die Projektbasis auf den ersten Release Candidate vorbereitet werden. Der Patch ergänzt dafür eine statische RC-Prüfung und beruhigt den Source-Cleanup.

## Änderungen

- Version auf `0.8.8-e` angehoben.
- `scripts/check-release-candidate-readiness.cjs` ergänzt.
- `package.json` um `rc:check`, `source:cleanup:verbose` und aktualisiertes `release:check` erweitert.
- Veraltete Testskripte mit bereits entfernten Testdateien bereinigt.
- Source-Cleanup meldet bereits bereinigte Dateien nur noch mit `--verbose`.
- `README.md`, `docs/README.md`, `docs/RELEASE_CHECKLIST.md` und `docs/CHANGELOG.md` aktualisiert.

## Abnahme

```bash
npm run rc:check
npm run test
npm run build
npm run build:linux
```

`rc:check` ersetzt nicht den Build und nicht die manuelle Fachabnahme. Es prüft, ob Versionsdateien, README, zentrale Doku, Cleanup- und Testskriptverweise konsistent sind.
