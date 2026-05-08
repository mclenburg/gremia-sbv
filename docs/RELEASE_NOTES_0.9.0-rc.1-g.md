# Release Notes – Gremia.SBV 0.9.0-rc.1-g

Stand: 0.9.0-rc.1-g

## Status

`0.9.0-rc.1-g` ist der erste Release Candidate von Gremia.SBV. Dieser Stand friert die fachliche Funktionalität nach der 0.8.13-Härtungsphase ein und dient der technischen, datenschutzfachlichen und praktischen Evaluation vor einem stabilen Release.

Nach diesem Release Candidate werden keine neuen Fachfeatures, neuen Inlinebefehle, großen Refactorings oder neuen Datenbankstrukturen mehr aufgenommen.

Zulässig bleiben nur Security-Fixes, Datenverlust-/Migrationsfixes, Buildfixes, Testfixes, Dokumentationskorrekturen und offensichtliche UI-Bugs ohne neue Fachlogik.

## Unterstützte Artefakte

Der GitHub-Release-Workflow erzeugt ein Draft Release mit Artefakten für:

- Linux AppImage,
- Windows 10+ als unsignierter Build,
- macOS als unsigniertes und nicht notarisiertes Evaluationsartefakt.

Linux und Windows sind die primären RC-Plattformen. macOS wird technisch mitgebaut, bleibt aber bis zu Signierung und Notarisierung ausdrücklich nicht als produktive macOS-Endanwenderdistribution freigegeben.

## Wichtige Funktionen

- lokale offline-first Fallaktenarbeit für Schwerbehindertenvertretungen,
- verschlüsselte lokale Datenhaltung,
- BEM, Prävention, Beteiligung, Kündigungsanhörung, Gleichstellung/GdB und Arbeitsplatzanpassung,
- Live-Protokolle mit klickbaren Aktenbezügen für `/bem`, `/praev`, `/bet`, `/kuend`, `/gleich`, `/anp` und `/fr`,
- Fristen, Wiedervorlagen, Vorlagen, Dokumente und Tätigkeitsberichte,
- Backup/Restore mit aktuellen KDF-Parametern und Legacy-Restore-Unterstützung,
- Unlock-Delay ohne permanenten Lockout,
- Audit-Hash-Chain und datensparsame Audit-Metadaten,
- Exporte und Reports ohne unnötige technische UUIDs,
- E2E-Readiness für isolierte Testdaten, responsive Layouts und Barrierefreiheitsflüsse,
- layoutgehärtete Maßnahmenmasken mit theme-aware Dropdown-/Select-Listen.

## Qualitätssicherung

Der Vor-RC-Stand wurde lokal erfolgreich mit folgenden Gates verifiziert:

- `npm run test`,
- `npm run test:coverage`,
- `npm run build`,
- `npm run build:linux`,
- `npm run build:win`,
- `npm run release:check`.

Das Coverage-Gate nutzt Vitest mit `provider: 'v8'`, misst RC-kritische Service-Verträge und Policy-Services und verlangt mindestens 70 Prozent für Branches, Functions, Lines und Statements.

## Datenschutz und Sicherheit

Gremia.SBV verarbeitet besonders sensible personenbezogene Daten. Der RC bleibt deshalb bewusst lokal und offline-first:

- keine Cloud-Synchronisation,
- keine Telemetrie,
- keine Mehrbenutzer- oder Serverfunktion,
- keine HR-Rolle,
- keine externe Datenübertragung,
- keine automatische rechtliche oder organisatorische Freigabeentscheidung.

Die Software unterstützt datenschutzbewusste Dokumentation und Nachvollziehbarkeit. Die organisatorische Datenschutzfreigabe, IT-Sicherheitsprüfung, Datenschutz-Folgenabschätzung und rechtliche Bewertung bleiben Aufgabe der verantwortlichen Menschen und Organisationen.

## Build- und Installationshinweise

Für reproduzierbare Builds ist Node.js 20.19.0 oder neuer innerhalb der unterstützten LTS-/Current-Linien vorgesehen. Node 18 ist für den RC-Build nicht mehr freigegeben.

Empfohlen:

```bash
nvm install 20.19.0
nvm use 20.19.0
npm ci
npm run release:check
```

Der native Electron-Abhängigkeitsvertrag bleibt:

```json
"postinstall": "electron-builder install-app-deps"
```

`electron-builder` kann beim Packaging weiterhin einen generischen Hinweis zu diesem `postinstall`-Eintrag ausgeben. Entscheidend ist, dass der Eintrag vorhanden ist und der native Rebuild tatsächlich ausgeführt wird.

## Bekannte Einschränkungen

Die bekannten Einschränkungen stehen in `docs/KNOWN_ISSUES.md`. Besonders relevant für den RC:

- Windows-Builds sind unsigniert.
- macOS-Artefakte sind unsigniert und nicht notarisiert.
- E2E-Tests benötigen eine lokale Playwright-Installation.
- Große datenbankgebundene Services bleiben Post-RC-Kandidaten für weitere Modularisierung und Integrationstests.
- Die App ersetzt keine Rechtsberatung, Datenschutzfreigabe oder organisatorische Entscheidung.

## Lizenz

Gremia.SBV steht unter der GNU Affero General Public License v3.0 or later (`AGPL-3.0-or-later`). Drittkomponenten behalten ihre jeweiligen Upstream-Lizenzen.


## RC-Fixes d bis f

Dieser Stand enthält ausschließlich RC-zulässige Korrekturen: keine neuen Fachfeatures, sondern Bugfixes, Buildfixes, Security-Fixes, Datenverlust-/Migrationsfixes, offensichtliche UI-Bugs und Dokumentationskorrekturen.

- Das Anlegen einer Fallakte wurde responsiv gehärtet, damit das Dialogfenster im Viewport bleibt.
- Präventionsverfahren legen die automatische Wiedervorlage einen Tag nach der Arbeitgeber-Reaktionsfrist an.
- Große Textfelder behalten Kurzbefehle; die Erkennung ist auf den Cursorbereich begrenzt, damit lange Texte flüssig bearbeitbar bleiben.
- GitHub-Releases laden nur AppImage, EXE und DMG als Build-Artefakte hoch. GitHub-generierte Source-code-Archive bleiben davon unberührt.
- Die Grundlinie bleibt offline-first: keine Cloud-Synchronisation, keine Telemetrie und keine Mehrbenutzerfunktion.
- Lizenzstand bleibt AGPL-3.0-or-later.

## Korrektur 0.9.0-rc.1-g

- Stabilisiert die Kurzbefehls-Erkennung in großen Textfeldern: vorhandene alte Marker lösen beim normalen Weiterbearbeiten keine globale Modale mehr aus. Kurzbefehle bleiben weiterhin aktiv, werden aber nur ausgelöst, wenn der Befehlstoken selbst gerade eingegeben oder eingefügt wurde.
- Stabilisiert den E2E-Test für die Kurzbefehls-Hilfe durch einen capture-phase Shortcut-Handler und einen expliziten App-Shell-Wait im Viewport-Test.
- Keine neuen Fachfeatures, keine neue Datenbankstruktur, keine Cloud-Synchronisation.
