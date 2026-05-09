# Gremia.SBV – lokale Software für Schwerbehindertenvertretungen

**Gremia.SBV** ist eine lokale, offline-first Desktop-App für Schwerbehindertenvertretungen in Deutschland. Sie unterstützt vertrauliche SBV-Fallarbeit rund um BEM, Präventionsverfahren nach § 167 SGB IX, SBV-Beteiligung nach § 178 SGB IX, Kündigungsanhörungen, Gleichstellung/GdB, Arbeitsplatzanpassung, Fristen, Dokumentation und Tätigkeitsberichte – ohne Cloud, ohne Telemetrie und ohne HR-Zugriff.

Stand: **0.9.1**  
Status: Vor-1.0-Ergänzung `0.9.1` im RC-Zweig.

## Kurzüberblick

Gremia.SBV ist eine **SBV Software** für die besonders vertrauliche Fallarbeit der Schwerbehindertenvertretung. Die Anwendung bündelt Fallakten, Gesprächsnotizen, Live-Protokolle, Maßnahmen, Fristen, Dokumente, Vorlagen, Datenschutzdokumente und Berichte in einem lokalen Arbeitsbereich.

Die Produktregel lautet:

> Die Fallakte führt. Maßnahmen schreiben fort. Cockpits überwachen. Inlinebefehle beschleunigen. Berichte werten aus.

## Was Gremia.SBV besonders macht

- **SBV-first:** entwickelt für die vertrauliche Arbeit der Schwerbehindertenvertretung, nicht als HR-Kontrollsystem.
- **Offline-first:** lokale Desktop-App ohne Cloud-Synchronisation, ohne Telemetrie und ohne externe Datenübertragung.
- **Prozessnah:** BEM, Prävention, Beteiligung, Kündigungsanhörung, Gleichstellung/GdB, Arbeitsplatzanpassung und Fristen bleiben in einer Fallakte nachvollziehbar verbunden.
- **Lebende Arbeitschronik:** Notizen, Maßnahmen, Fristen und interne Aktenbezüge bilden eine nachvollziehbare Arbeitschronik statt einer losen Dateiablage.
- **Datenschutzbewusst:** lokale Verschlüsselung, sparsame Audit-Metadaten, kontrollierte Backups und exportfreundliche Berichte ohne unnötige technische IDs.
- **Menschliche Verantwortung bleibt erhalten:** Die App unterstützt Dokumentation und Nachvollziehbarkeit, ersetzt aber keine rechtliche Bewertung, keine Datenschutzfreigabe und keine organisatorische Entscheidung.

## Für wen ist Gremia.SBV gedacht?

Gremia.SBV richtet sich an gewählte Vertrauenspersonen der schwerbehinderten Menschen, stellvertretende Mitglieder und kleine SBV-Teams, die eine lokale Software für Schwerbehindertenvertretungen suchen und besonders sensible personenbezogene Daten datenschutzbewusst strukturieren möchten.

Typische Einsatzfelder:

- BEM Dokumentation und Maßnahmenverfolgung,
- Präventionsverfahren nach § 167 SGB IX,
- Beteiligung der SBV nach § 178 SGB IX,
- Kündigungsanhörungen schwerbehinderter oder gleichgestellter Menschen,
- Gleichstellung/GdB-Verfahren,
- behinderungsgerechte Arbeitsplatzgestaltung,
- Fristen, Wiedervorlagen und Tätigkeitsberichte.

## Datenschutz: lokal statt Cloud

Gremia.SBV verarbeitet besonders sensible personenbezogene Daten. Deshalb ist die Anwendung konsequent offline-first konzipiert:

- keine Cloud-Synchronisation,
- keine Telemetrie,
- keine Mehrbenutzer- oder Serverfunktion,
- lokale verschlüsselte Datenhaltung,
- kontrollierte Backups,
- sparsame Audit-Metadaten,
- keine Übertragung an externe Dienste.

Die App ersetzt keine organisatorische Datenschutzfreigabe. Vor produktiver Nutzung sind insbesondere Datenschutzbeauftragte, IT-Security und die verantwortliche Stelle einzubeziehen.

## Unterstützte SBV-Prozesse

- Fallakten für vertrauliche SBV-Vorgänge
- Live-Protokolle und Gesprächsnotizen mit internen Aktenbezügen
- BEM, Prävention, SBV-Beteiligung, Kündigungsanhörung, Gleichstellung/GdB und Arbeitsplatzgestaltung
- Fristen und Wiedervorlagen
- Dokumentenimport in den lokalen Tresor
- Vorlagen und strukturierte Schreiben
- Berichte und System-/Integritätsberichte
- Compliance-Dokumente wie TOMs, VVT, DSFA-Entwurf und Release-Checkliste
- lokales Audit-Log mit Hash-Chain
- Auto-Lock und Sicherheitsstatus

## Grenzen der Software

Gremia.SBV ist ein Arbeitswerkzeug für die SBV. Die Anwendung bietet keine Rechtsberatung und trifft keine menschlichen oder organisatorischen Freigabeentscheidungen. Sie bewertet technische Zustände, unterstützt Dokumentation und macht Vorgänge nachvollziehbar – die rechtliche Bewertung und Interessenvertretungsentscheidung bleiben bei den zuständigen Menschen.

## Installation und Build

Voraussetzungen:

- Node.js 20.19.0 oder neuer innerhalb der unterstützten LTS-/Current-Linien,
- npm,
- native Build-Abhängigkeiten für Electron/SQLite,
- Linux-Desktop für AppImage-Builds,
- Windows 10+ für Windows-Builds.

Nach `npm install` werden native Electron-Abhängigkeiten automatisch passend zur Electron-Version gebaut:

```bash
npm install
```

Der dafür verbindliche Vertrag in `package.json` lautet:

```json
"postinstall": "electron-builder install-app-deps"
```

Entwicklung:

```bash
npm run dev
```

Build:

```bash
npm run build
npm run build:linux
npm run build:win
```

## Tests und Qualitätssicherung

```bash
npm run test
npm run rc:check
npm run build:readiness:strict
```

E2E-Tests laufen ausschließlich mit isolierten temporären Testdaten:

```bash
npm run test:e2e:setup
npm run test:e2e
```

## Dokumentation

- `docs/BUILD.md`
- `docs/E2E_TESTS.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/SECURITY.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_0.9.1.md`
- `docs/LICENSE_POLICY.md`

## Lizenz

Gremia.SBV steht unter der **GNU Affero General Public License v3.0 or later** (`AGPL-3.0-or-later`). Die Lizenz ist bewusst gewählt, damit die Software als freie SBV-first-Anwendung prüfbar, weiterentwickelbar und nicht ohne Rückgabe von Verbesserungen proprietär vereinnahmt werden kann.

Weitere Hinweise stehen in `LICENSE`, `NOTICE` und `docs/LICENSE_POLICY.md`. Drittkomponenten bleiben unter ihren jeweiligen Upstream-Lizenzen.

## Release-Status

Gremia.SBV befindet sich mit `0.9.1` im Vor-1.0-RC-Zweig. 0.9.1 ergänzt das im RC aufgefallene Personenverzeichnis; danach werden bis 1.0 keine neuen Fachfunktionen mehr aufgenommen. Zulässig sind nur Bugfixes, Buildfixes, Security-Fixes, Datenverlust-/Migrationsfixes, offensichtliche UI-Bugs und Dokumentationskorrekturen.


### RC-Fix 0.9.0-rc.1-p – Fallakte, Prävention und CSS-Baseline

Dieser Patch härtet die Fallaktenarbeit vor Version 1.0:

- Das Modal „Neue Fallakte anlegen“ nutzt kein starres 5-Spalten-Raster mehr, sondern ein responsives Auto-Fit-Grid mit Zwischen-Breakpoint für Tablet-/kleine Desktopbreiten.
- Die Fallregister-Toolbar darf umbrechen; Suchfeld und Titel kollidieren dadurch nicht mehr auf schmalen Viewports.
- Die CSS-Basis enthält nur noch eine führende `.case-workbench`-Definition; die widersprüchliche historische Definition mit `minmax(280px, 360px)` wurde entfernt.
- Die Sidebar-Positionierung ist zwischen `globals.css` und `responsiveDesign.css` nicht mehr widersprüchlich dokumentiert; schmale Navigationen erhalten eine sichtbare Overflow-Andeutung.
- Präventionsverfahren erzeugen aus der Arbeitgeber-Reaktionsfrist eine Wiedervorlage am Folgetag. Die Reaktionsfrist selbst wird als Erinnerung (`reminderAt`) an der Wiedervorlage dokumentiert.
- Lange Textfelder im Präventionsdetail und in Maßnahmen werden lokal bearbeitet und erst beim Verlassen des Feldes gespeichert.

Regressionstest: `npm run test:rc-fix-case-prevention-css-090rc1d`.

### RC-Fix 0.9.0-rc.1-p – Kurzbefehle in großen Textfeldern

Dieser Patch korrigiert die Textbefehls-Strategie aus `0.9.0-rc.1-p`:

- Kurzbefehle bleiben in den großen Fallakten- und Präventionstextfeldern aktiv.
- Die Performance wird nicht durch Abschalten der Funktion erreicht; der Inline-Kommando-Scan bleibt fachlich unverändert aktiv.
- Die Präventions- und Maßnahmen-Textfelder persistieren lange Texte erst bei `onBlur`, nicht pro Tastendruck.
- Die großen Protokollfelder der Fallnotiz verwenden weiterhin die globalen Textbefehle.

Regressionstest: `npm run test:rc-fix-case-prevention-css-090rc1e`.

### RC-Fix 0.9.0-rc.1-p – Maßnahmenfelder mit Lost-Focus-Speicherung

Textfelder und TextAreas in fallaktenbezogenen Maßnahmen speichern ihre Inhalte nicht mehr bei jedem Tastendruck, sondern erst beim Verlassen des Feldes. Die bestehende Inline-Kommando-Erkennung bleibt unverändert aktiv.
### RC-Fix 0.9.0-rc.1-p – Windows wieder portable EXE

Der Windows-Build erzeugt wieder eine direkt startbare portable EXE statt eines NSIS-Installers. Die Release-Hygiene bleibt erhalten: GitHub lädt weiterhin nur die drei Endanwender-Artefakte `.AppImage`, `.dmg` und `.exe` hoch.


## 0.9.1: Personenverzeichnis und Import

Gremia.SBV 0.9.1 ergänzt vor dem 1.0-Freeze ein datensparsames Personenverzeichnis für schwerbehinderte und gleichgestellte Beschäftigte. Der genaue GdB wird nicht als Standardfeld gespeichert; entscheidend ist der Schutzstatus. Arbeitgeberlisten können aus CSV/XLSX über einen kompakten Import-Assistenten importiert werden: Datei oder CSV auswählen, Vorschau prüfen, echte Spalten den Zielfeldern zuordnen, Importprüfung bestätigen. Die Personalnummer ist optional, und Namen können getrennt oder in einer gemeinsamen Spalte stehen, auch im Format `Nachname, Vorname`.

Statusabläufe erzeugen 30-Tage-Warnungen im bestehenden Fristensystem. Nach Ablauf wird eine Datenschutzprüfung erforderlich; strukturierte Anonymisierung entfernt direkte Identifikatoren und markiert verknüpfte Fallakten zur Prüfung. Fristen können manuell als iCal exportiert werden; der Standardexport enthält keine Namen, Diagnosen oder Fallinhalte.
