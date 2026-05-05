# Patch 0.8.8-h – Plattformbuilds härten

## Ziel

Der Build-Prozess soll auf echten Zielsystemen funktionieren:

- Linux: `npm run build:linux`
- Windows 10+: `npm run build:win`
- macOS: `npm run build:mac`

## Änderungen

- Bash-Abhängigkeit aus dem Windows-Build entfernt.
- Plattformbuilds laufen über `scripts/build-platform.cjs`.
- macOS-Build ergänzt.
- `native:clean` ist jetzt plattformneutral.
- `build:current` baut automatisch die aktuelle Plattform.
- `build:platforms:check` prüft die Build-Skriptverträge.
- `docs/BUILD.md` dokumentiert Linux, Windows und macOS.

## Abgrenzung

Netzwerk-/Proxyfehler beim `npm install` kann die App nicht technisch beheben. Der Build-Prozess vermeidet aber unnötige optionale Abhängigkeiten im Standardinstallationspfad und nutzt lokale Binärdateien statt `npx`-Autoinstallationen.
