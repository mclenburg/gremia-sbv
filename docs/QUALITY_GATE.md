# Gremia.SBV Qualitätsfreigabe-Checkliste

Diese Checkliste beschreibt den verbindlichen Qualitätsstand für die öffentliche Bereitstellung. Sie ist kein Wunschzettel für spätere Arbeit, sondern ein Qualitätsgate.


## Versions- und RC-Gates

- Öffentliche Builds nutzen eine stabile SemVer-Version ohne Arbeitsstand-Zusatz.
- `package.json`, `package-lock.json`, `src/app/generated/appVersion.ts` und `services/generated/appMetadata.ts` müssen dieselbe Version ausweisen.
- Entwicklungskennzeichen wie `-rc`, `-d1`, `-d4`, `alpha`, `beta` oder lokale Patchnamen dürfen nicht in die sichtbare App-Version gelangen.
- Die verbindliche lokale Freigabelinie ist in diesem Qualitätsgate dokumentiert; Änderungen an Freigabe-Skripten müssen diese Datei mitprüfen.
- Das Benutzerhandbuch unter `docs/handbuch/` gehört zum Releaseumfang und darf nicht hinter der Anwendung zurückbleiben.

## Produktlinie

- Gremia.SBV bleibt offline-first und verarbeitet SBV-Falldaten lokal.
- Exporte, Backups und Übergaben zeigen sichtbares Ergebnisfeedback, ohne sensible Inhalte ins Audit zu schreiben.
- Die README richtet sich zuerst an SBVen und erst danach an Entwicklerinnen und Entwickler.

## Architektur-Gates

- Feature-Views orchestrieren nur noch. Eigener Prozess-State gehört in Hooks, UI in Teilkomponenten und Fachlogik in kleine Logic-/Utility-Dateien.
- Neue UI nutzt zuerst zentrale Workbench-, Panel-, Button-, Form-, Badge-, Dialog-, Listen- und Empty-State-Komponenten.
- Keine neuen Feature-CSS-Dateien und keine direkten Feature-CSS-Imports.
- Audit-Ereignisse werden nur über zentrale Builder erzeugt.
- Große Dateien benötigen eine fachliche Begründung; neue Monolithen sind Freigabeblocker.

## Accessibility-Gates

- Dialoge haben `role="dialog"` oder `role="alertdialog"`, `aria-modal`, Fokussteuerung, ESC-Verhalten und Fokus-Rückgabe.
- Formulare verknüpfen Label, Hilfe und Fehler über `htmlFor`, `aria-describedby`, `aria-invalid`, `aria-required` und `role="alert"`.
- Icon-only-Buttons müssen ein `aria-label` besitzen.
- Asynchrone erfolgreiche Aktionen und Fehler in Kernflows melden sich über Live-Regionen.
- Kurzbefehle funktionieren in großen Textareas inklusive Inline-Overlay.
- Axe prüft die primären Arbeitsbereiche und den Kurzbefehle-Dialog auf serious/critical WCAG-Verstöße; Farbkontraste bleiben zusätzlich durch das Visual-QA-Gate abgesichert.

## Test-/Build-Gates

Vor öffentlicher Bereitstellung müssen grün laufen:

- `npm run security:audit`
- `npm run licenses:check`
- `npm run build`
- `npm run test:e2e`
- `npm run test:e2e:visual`
- `npm run test:e2e:core-ui-flows`
- `npm run test:e2e:complete-tour`
- `npm run test:e2e:a11y`
- `npm run build:readiness:strict`
- `npm run release:check`

## Visuelle Gates

- Light-Mode enthält keine dunklen Restflächen.
- Dark-Mode enthält keine hellen Fremdflächen.
- Badges sind kantig und nutzen zentrale Status-/Risk-/Deadline-Tonalitäten.
- Dropdowns, Inputs, Textareas und Buttons nutzen das Industrial-Chrome.

## Erweiterbarkeit

Community-Beiträge müssen sich an die zentrale UI-Schicht, Audit-Builder, Datenschutzlinie und A11y-Gates halten. Abweichungen werden nur akzeptiert, wenn sie fachlich begründet, klein und getestet sind.


## Öffentliche Qualitätsgates

- `THIRD_PARTY_LICENSES.txt` ist erzeugt und aktuell.
- Root-`SECURITY.md` beschreibt die vertrauliche Meldung von Sicherheitslücken.
- Die Code-Signing-Strategie ist in `docs/CODE_SIGNING.md` dokumentiert.
- Die README beschreibt den Demo-Start für fertige AppImage-/EXE-Artefakte vor den Entwicklerbefehlen.
- Das Public-Qualitätsgate umfasst `npm run test:e2e:a11y` als automatisierten Axe-Scan.

## Lokale Freigabe vor öffentlicher Bereitstellung

Die taggebundene GitHub-Action ist bewusst auf schnelle, günstige Gates begrenzt. Die Browser-basierten Prüfungen laufen deshalb lokal vor dem Push oder vor dem Tag:

```bash
npm run release:local-e2e
```

Dieses lokale Gate führt die isolierte Playwright-/Axe-Installation sowie Visual-, Core-UI-, Complete-Tour- und Accessibility-E2E-Tests aus. Ein Release-Tag darf erst gesetzt werden, wenn dieses Gate lokal grün war.

Zusätzlich gehört zur Freigabe vor öffentlicher Bereitstellung der schnelle Backup-/Restore-Prozesscheck:

```bash
npm run release:check:backup-restore
```

Er erzeugt ein verschlüsseltes Testbackup, inspiziert das Manifest, stellt den Tresor wieder her und prüft, dass Dokumentcontainer bitgleich zurückkommen, während temporäre Dateien und verschachtelte Backups ausgeschlossen bleiben.

Die UI-Konsistenz wird vor öffentlicher Bereitstellung außerdem statisch gesweept:

```bash
npm run ui:control-sweep
```

Der Sweep stellt sicher, dass native Inputs, Selects und Textareas über zentrale Industrial-Selektoren oder bewusst erlaubte zentrale Kontexte laufen.


## Freigabelinie für öffentliche Builds

Diese Checkliste ersetzt kein Testprotokoll. Sie legt fest, welche Prüfungen vor einer öffentlichen Bereitstellung nicht übersprungen werden dürfen.

### Versionierung

Die sichtbare App-Version wird aus `package.json` erzeugt und in die generierten Metadaten geschrieben. Für öffentliche Builds gilt eine stabile SemVer-Version ohne Entwicklungsanhang.

Vor der Freigabe muss gelten:

- `package.json` und `package-lock.json` tragen dieselbe Version.
- `src/app/generated/appVersion.ts` ist aus `package.json` erzeugt.
- `services/generated/appMetadata.ts` ist aus `package.json` erzeugt.
- Die Version enthält keinen Patch-, RC- oder Arbeitsstand-Zusatz.

Die technische Prüfung läuft über:

```bash
npm run version:generate
npm run rc:check
```

### Lokale Pflicht-Gates

Vor einem Freigabe-Tag werden lokal ausgeführt:

```bash
npm run security:audit
npm run licenses:check
npm run release:check
npm run release:local-e2e
npm run ui:control-sweep
```

`release:check` deckt statische Readiness, Backup-/Restore-Prozesscheck, Coverage und App-Build ab. `release:local-e2e` deckt die Browser-, Accessibility- und Visual-Gates ab, die bewusst nicht in der taggebundenen Free-Account-Action laufen.

### Fachliche Smoke-Tests

Zusätzlich zu automatisierten Tests werden vor Veröffentlichung diese Arbeitswege manuell geprüft:

1. App im Demo-Modus starten.
2. Fallakte öffnen und Maßnahme ansehen.
3. SBV-Beteiligung öffnen.
4. Beteiligungsverstoß aus der SBV-Beteiligung heraus anlegen.
5. Fehlerfall im Formular auslösen und wieder korrigieren.
6. Verstoß speichern.
7. Dokumententwurf erzeugen.
8. Wiedervorlage anlegen.
9. Journal-Eintrag aus Kontext vorbereiten.
10. Tätigkeitsbericht erzeugen.
11. Backup erstellen.
12. Restore in leerem Testdatenverzeichnis prüfen.

Bei diesen Schritten dürfen keine Namen, Diagnosen oder vertraulichen Freitexte unbeabsichtigt in Audit, Statusmeldungen, Dateinamen oder automatische Exporte gelangen.

### Datenschutz- und Sicherheitsfreigabe

Vor einer breiteren Nutzung müssen die Unterlagen unter `docs/` gegen die eigene Organisation geprüft werden:

- `DATENSCHUTZKONZEPT.md`,
- `DSFA_SBV_TEMPLATE.md`,
- `VERARBEITUNGSVERZEICHNIS_SBV.md`,
- `LOESCHKONZEPT_SBV.md`,
- `FREIGABE_DSB_IT_SECURITY.md`,
- `SECURITY.md`,
- `PRIVACY_AND_SECURITY.md`,
- `ACCESSIBILITY.md`.

Die Anwendung liefert technische Schutzmechanismen. Sie ersetzt nicht die organisatorische Freigabe für den konkreten Einsatzort.

### Freigabe-Blocker

Ein öffentlicher Build ist blockiert, wenn einer der folgenden Punkte vorliegt:

- Full-Suite oder Build rot.
- Backup-/Restore-Prozesscheck rot.
- E2E-Kernflow Beteiligungsverstoß rot.
- Serious oder critical Accessibility-Befund in Kernflows.
- Kritischer npm-Audit-Befund in produktionsrelevantem Renderer-/Electron-Pfad ohne dokumentierte Bewertung.
- Versehentliche Direktidentifikatoren in Audit, Dateinamen, Live-Regionen oder Standardexporten.
- Migration und Fresh-Schema weichen voneinander ab.
- Dokumentation beschreibt einen anderen Fachfluss als die Anwendung.

Erst wenn diese Gates erfüllt sind, ist der Build pilot- und releasefähig. Neue Features werden nach dieser Prüfung nicht mehr in denselben Freigabezweig aufgenommen; ab diesem Punkt werden nur noch Blocker behoben.
