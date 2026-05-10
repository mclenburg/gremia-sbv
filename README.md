# Gremia.SBV – lokale Software für Schwerbehindertenvertretungen

**Gremia.SBV** ist eine lokale, offline-first Desktop-App für Schwerbehindertenvertretungen in Deutschland. Sie unterstützt vertrauliche SBV-Fallarbeit rund um BEM, Präventionsverfahren nach § 167 SGB IX, SBV-Beteiligung nach § 178 SGB IX, Kündigungsanhörungen, Gleichstellung / Schutzstatus / GdB-Beratung, Arbeitsplatzanpassung, Fristen, Dokumentation und Tätigkeitsberichte – ohne Cloud, ohne Telemetrie und ohne HR-Zugriff.

Stand: **0.9.1**  
Status: Vor-1.0-Ergänzung im RC-Zweig.

## Kurzüberblick

Gremia.SBV ist eine **SBV Software** für die besonders vertrauliche Fallarbeit der Schwerbehindertenvertretung. Die Anwendung bündelt Personenverzeichnis, Fallakten, Gesprächsnotizen, Live-Protokolle, Maßnahmen, Fristen, Dokumente, Vorlagen, Datenschutzdokumente und Berichte in einem lokalen Arbeitsbereich.

Die Produktregel lautet:

> Personen führen. Die Fallakte führt die Arbeitschronik. Maßnahmen schreiben fort. Fristen überwachen. Inlinebefehle beschleunigen. Compliance macht Datenschutzentscheidungen nachvollziehbar.

## Was Gremia.SBV besonders macht

- **SBV-first:** entwickelt für die vertrauliche Arbeit der Schwerbehindertenvertretung, nicht als HR-Kontrollsystem.
- **Offline-first:** lokale Desktop-App ohne Cloud-Synchronisation, ohne Telemetrie und ohne externe Datenübertragung.
- **Personengebundene Fallarbeit:** reguläre Fallakten werden an Personen aus dem Personenverzeichnis gebunden; anonyme Erstberatungen sind als pseudonyme Anfrage möglich.
- **Prozessnah:** BEM, Prävention, Beteiligung, Kündigungsanhörung, Gleichstellung / Schutzstatus / GdB-Beratung, Arbeitsplatzanpassung und Fristen bleiben in einer Fallakte nachvollziehbar verbunden.
- **Lebende Arbeitschronik:** Notizen, Maßnahmen, Fristen und interne Aktenbezüge bilden eine nachvollziehbare Arbeitschronik statt einer losen Dateiablage.
- **Datenschutzbewusst:** lokale Verschlüsselung, Audit-Hash-Kette ohne Direktidentifikatoren, kontrollierte Backups, Statusablaufprüfung, Lösch-/Anonymisierungsworkflow und exportfreundliche Berichte ohne unnötige technische IDs.
- **Menschliche Verantwortung bleibt erhalten:** Die App unterstützt Dokumentation und Nachvollziehbarkeit, ersetzt aber keine Rechtsberatung, keine Datenschutzfreigabe und keine organisatorische Entscheidung.

## Für wen ist Gremia.SBV gedacht?

Gremia.SBV richtet sich an gewählte Vertrauenspersonen der schwerbehinderten Menschen, stellvertretende Mitglieder und kleine SBV-Teams, die eine lokale Software für Schwerbehindertenvertretungen suchen und besonders sensible personenbezogene Daten datenschutzbewusst strukturieren möchten.

Typische Einsatzfelder:

- BEM Dokumentation und Maßnahmenverfolgung,
- Präventionsverfahren nach § 167 SGB IX,
- Beteiligung der SBV nach § 178 SGB IX,
- Kündigungsanhörungen schwerbehinderter oder gleichgestellter Menschen,
- Gleichstellung / Schutzstatus / GdB-Beratung,
- behinderungsgerechte Arbeitsplatzgestaltung nach § 164 Abs. 4 SGB IX,
- Personenverzeichnis schwerbehinderter und gleichgestellter Beschäftigter,
- Fristen, Wiedervorlagen, iCal-Export und Tätigkeitsberichte.

## Personenverzeichnis und Import

Gremia.SBV 0.9.1 ergänzt vor dem 1.0-Freeze ein datensparsames Personenverzeichnis für schwerbehinderte und gleichgestellte Beschäftigte. Der genaue GdB wird nicht als Standardfeld gespeichert; entscheidend ist der Schutzstatus. Arbeitgeberlisten können aus CSV/XLSX über einen kompakten Import-Assistenten importiert werden: Datei oder CSV auswählen, Vorschau prüfen, echte Spalten den Zielfeldern zuordnen, Importprüfung bestätigen.

Die **Personalnummer ist optional**. Aktualisiert wird bevorzugt über Personalnummer oder dienstliche E-Mail. Name und Vorname können getrennt oder in einer gemeinsamen Spalte stehen, auch im Format **`Nachname, Vorname`**. Name/Vorname allein gelten beim Import nur als Konflikthinweis, nicht als automatisches Update.

## Fallaktenbindung und anonyme Anfrage

Neue reguläre Fallakten sollen zu genau einer Person gehören. Wenn der Status unklar ist, wird eine Person mit Status „Status unklar“ oder „Antrag läuft“ angelegt. Für Erstberatungen ohne Namensnennung gibt es einen pseudonymen Sonderweg „Anonyme Anfrage“ ohne Direktidentifikatoren.

Bestehende Altakten werden nicht geratenhaft aus Freitexten verknüpft. Sichere vorhandene `person_case_links` werden migriert; mehrdeutige oder nicht verknüpfte Altakten werden priorisiert zur Prüfung markiert.

## Datenschutz: lokal statt Cloud

Gremia.SBV verarbeitet besonders sensible personenbezogene Daten. Deshalb ist die Anwendung konsequent offline-first konzipiert:

- keine Cloud-Synchronisation,
- keine Telemetrie,
- keine Mehrbenutzer- oder Serverfunktion,
- lokale verschlüsselte Datenhaltung mit SQLCipher,
- kontrollierte Backups,
- Audit-Metadaten ohne Namen, E-Mail-Adressen oder Personalnummern,
- keine Übertragung an externe Dienste.

Die App ersetzt keine organisatorische Datenschutzfreigabe. Vor produktiver Nutzung sind insbesondere Datenschutzbeauftragte, IT-Security und die verantwortliche Stelle einzubeziehen.

## Fristen und iCal

Fristen und Wiedervorlagen werden im bestehenden Fristenmodul geführt. Statusablaufwarnungen aus dem Personenverzeichnis landen nicht in einem parallelen System, sondern als Fristen im bestehenden Dashboard. Der iCal-Export erzeugt manuell exportierbare `.ics`-Dateien. Standard ist die Datenschutzstufe `process_type`: Kalendertermine zeigen den Prozesstyp wie „BEM-Wiedervorlage“ oder „Statusnachweis läuft ab“, aber keine Namen, Diagnosen, Personalnummern oder Fallnotizen.

## Unterstützte SBV-Prozesse

- Personenverzeichnis mit Schutzstatus, Beschäftigungsstatus und Statusablaufprüfung
- Fallakten für vertrauliche SBV-Vorgänge
- Live-Protokolle und Gesprächsnotizen mit internen Aktenbezügen
- BEM, Prävention, SBV-Beteiligung, Kündigungsanhörung, Gleichstellung / GdB-Beratung und Arbeitsplatzgestaltung
- Fristen, Wiedervorlagen und iCal-Export
- Dokumentenimport in den lokalen Tresor
- Vorlagen und strukturierte Schreiben
- Berichte und System-/Integritätsberichte
- Compliance-Dokumente wie TOMs, VVT, DSFA-Entwurf und Release-Checkliste
- lokales Audit-Log mit Hash-Chain ohne Direktidentifikatoren
- Auto-Lock und Sicherheitsstatus

## Grenzen der Software

Gremia.SBV bietet keine Rechtsberatung und trifft keine menschlichen oder organisatorischen Freigabeentscheidungen. Sie bewertet technische Zustände, unterstützt Dokumentation und macht Vorgänge nachvollziehbar – die rechtliche Bewertung und Interessenvertretungsentscheidung bleiben bei den zuständigen Menschen. Die App garantiert keine DSGVO-Konformität; sie liefert Bausteine für eine datenschutzbewusste lokale Arbeitsweise.

## Installation und Build

Voraussetzungen:

- Node.js 20.19.0 oder neuer innerhalb der unterstützten LTS-/Current-Linien,
- npm,
- native Build-Abhängigkeiten für Electron/SQLite,
- Linux-Desktop für AppImage-Builds,
- Windows 10+ für Windows-Builds.

Nach `npm install` werden native Electron-Abhängigkeiten automatisch passend zur Electron-Version gebaut (`electron-builder install-app-deps`):

```bash
npm install
npm run test
npm run test:e2e
npm run rc:check
npm run build:linux
```

Für Windows:

```bash
npm run build:win
```

Der Windows-Build ist als portable direkt startbare EXE vorgesehen; der Release-Upload soll nur `.exe`, `.AppImage` und `.dmg` veröffentlichen.

## Test-, Doku- und Release-Synchronisierung

Für 0.9.1 sind README, Roadmap, Build-/Release-Dokumentation und Test-Gates synchron zu halten. Vorveröffentlichte Release-Notes, Change-Logs und Patchnotizen werden nicht im aktiven Dokumentationsbestand gepflegt. Neue Tests sollen plattformunabhängig laufen und Fachlogik bevorzugt über Verhalten statt über brüchige Detailstrings prüfen.

## Release-Unterlagen

- Release-Checkliste: `docs/RELEASE_CHECKLIST.md`
- Build-Dokumentation: `docs/BUILD.md`
- Datenschutz- und Compliance-Dokumente: `docs/DSFA_SBV_TEMPLATE.md`, `docs/VERARBEITUNGSVERZEICHNIS_SBV.md`, `docs/DATENSCHUTZKONZEPT.md`, `docs/LOESCHKONZEPT_SBV.md`

## Lizenz

Gremia.SBV steht unter **AGPL-3.0-or-later**. Die Lizenz ersetzt keine datenschutzrechtliche Freigabe und keine organisatorische Prüfung vor produktiver Nutzung.
