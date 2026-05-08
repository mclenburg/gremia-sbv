# Gremia.SBV 0.9.0-rc.1-o

## Build- und Release-Fix

- Windows baut wieder eine portable, direkt startbare EXE statt eines NSIS-Installers.
- Der GitHub-Release-Upload bleibt auf die drei Endanwender-Artefakte beschränkt: `.AppImage`, `.dmg` und `.exe`.
- `package.json`, `package-lock.json` und generierte Versionsmetadaten stehen auf `0.9.0-rc.1-o`.

## RC-Freeze

Ab `0.9.0-rc.1-o` bleibt der Funktionsumfang eingefroren: Es werden **keine neuen Fachfeatures** ergänzt und insbesondere **keine Cloud-Synchronisation** eingeführt. Zulässig bleiben Security-Fixes, Datenverlust- und Migrationsfixes, offensichtliche UI-Bugs sowie Dokumentationskorrekturen. Die Lizenz bleibt **AGPL-3.0-or-later**.
