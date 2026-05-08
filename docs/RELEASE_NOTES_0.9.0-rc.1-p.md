# Release Notes 0.9.0-rc.1-p

## Zweck dieses Patches

Dieser Patch synchronisiert die Testverträge nach den RC-Fixes für Maßnahmenbearbeitung und Windows-Artefakte. Er unterscheidet bewusst zwischen fehlerhaftem Test und fehlerhaftem Programmcode:

- Die Programmcode-Entscheidung ist korrekt: große Maßnahmen-Textfelder speichern erst bei `onBlur` / Lost Focus, damit keine Datenbankaktualisierung bei jedem Tastendruck erfolgt.
- Die Inline-Kommando-Erkennung bleibt auf der Ursprungspolitik `findFirstTextCommand(event.target.value)` und wird nicht erneut per Cursor-/Delta-Scan verändert.
- Der fehlschlagende Maßnahmen-Test war zu grob formuliert, weil sein Regex über mehrere JSX-Tags hinweg lief und dadurch nicht-textuelle `onChange`-Felder als Textfeld-Persistenz wertete.
- Windows baut weiterhin eine portable Direktstart-EXE, keinen NSIS-Installer.
- Release-Artefakte bleiben auf AppImage, EXE und DMG begrenzt.

## RC-Freeze

Nach RC1 gilt weiter Feature-Freeze. Zulässig bleiben nur Bugfixes, Buildfixes, Security-Fixes, Datenverlust-/Migrationsfixes, offensichtliche UI-Bugs und Dokumentationskorrekturen. Es werden keine neuen Fachfeatures aufgenommen, keine Cloud-Synchronisation ergänzt und keine Lizenzänderung weg von `AGPL-3.0-or-later` vorgenommen.

## Tests

- `npm run test:rc-measure-blur-persistence-090rc1n`
- `npm run test:rc-windows-portable-artifact-090rc1o`
- `npm run test:rc-final-test-sync-090rc1p`
- `npm run test`
- `npm run test:e2e`
