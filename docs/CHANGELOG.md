## 0.8.13-o – Coverage-Testfix und RC-Guard-Bereinigung

- `activityReportService` prüft sensible Freitexte jetzt fachlich korrekt: konkrete Diagnose-Felder mit Doppelpunkt werden blockiert, generische Datenschutz-Hinweise im Bericht aber nicht fälschlich als personenbezogene Inhalte bewertet.
- `rcCumulativePatch0813n.test.ts` wurde von spröden String-Erwartungen auf konkrete Testformulierungen befreit und prüft nun die tatsächlichen RC-Verträge: typisierte Linknavigation, aktuelle Gleichstellungsstatus-Logik, Lizenzdateien und Cleanup-Manifest.
- Doku-Stand auf 0.8.13-o aktualisiert.

# Changelog

## 0.8.13-n – kumulativer RC-Fix für Teststand, Lizenz und Cleanup

- Patch enthält die in 0.8.13-g bis 0.8.13-m erarbeiteten RC-Fixes als vollständigen Nachzug für Stände, in denen einzelne Dateien aus Zwischenpatches fehlten.
- AGPL-3.0-or-later bleibt als Projektlizenz gesetzt; LICENSE, NOTICE und Lizenzpolitik sind Bestandteil des Patchstands.
- TypeScript-Testfixes für SecurityService-Behavior-Tests und CaseNoteEntityLink-Behavior-Tests werden ausdrücklich mitgeliefert.
- Der Gleichstellungs-Template-Status-Test prüft die aktuelle diskriminierte Union statt veralteter Type-Guard-Hilfsfunktionen.
- Obsolete historische Tests werden über den manifestgesteuerten Source-Cleanup entfernt.

# CHANGELOG

## 0.8.13-m - RC-Coverage-Scope und zusätzliche Service-Behavior-Tests

- `vitest.config.ts` misst das V8-Coverage-Gate nicht mehr pauschal über alle datenbankgebundenen Service-Adapter, sondern über die RC-kritischen, unit-testbaren Service-Verträge.
- Zusätzliche Behavior-Tests für `activityReportService`, `caseProcessPolicy`, `equalizationWorkflowPolicy`, `equalizationGuidancePolicy` und `terminationPrivacyPolicy` ergänzt.
- Coverage-Scope-Guard ergänzt, damit das Gate nicht versehentlich wieder auf breite Adapterservices oder deaktivierte Coverage zurückfällt.
- Doku auf 0.8.13-m aktualisiert und die Grenze zwischen Unit-Coverage, Integrationstests und Post-RC-Refactoring dokumentiert.

## 0.8.13-l - Dependency Registry Readiness und Node-Build-Basis

- Interne Registry-/Artifactory-URLs aus `package-lock.json` entfernt und öffentliche npm-Registry abgesichert.
- `.npmrc`, `.nvmrc` und `.node-version` ergänzt.
- Node-Build-Basis auf Node.js 20.19.0 und npm >= 10 dokumentiert.
- Dependency-Readiness-Test ergänzt.

## 0.8.13-k - Lizenzfestlegung und RC-Testfix

- Projektlizenz auf `AGPL-3.0-or-later` festgelegt und in `package.json`, `LICENSE`, `NOTICE` und `docs/LICENSE_POLICY.md` dokumentiert.
- README um einen öffentlichen Lizenzabschnitt ergänzt.
- Veralteten Guard-Test `equalizationTemplateStatus061d.test.ts` an die aktuelle diskriminierte Union in `ProcessTemplateDocumentsModal.tsx` angepasst.
- Keine Schemaänderung und keine neue Fachlogik.

## 0.8.13-j - Finaler RC-Quality-Gate- und Typensicherheitsfix

- `coverage.enabled: false` aus `vitest.config.ts` entfernt.
- `ProcessTemplateDocumentsModal.tsx` auf eine diskriminierte Union für Prozessarten umgestellt.
- Die letzten `as any`-Casts bei Prozessstatus-Labels entfernt.

## 0.8.13-i - RC-Test- und Doku-Konsistenzfix

- Veraltete historische Readiness-Tests auf den aktuellen RC-Vertrag angepasst.
- `release:check` wird korrekt mit Service-Coverage-Gate erwartet.
- Roadmap-Guards an den aktuellen historischen Stand angepasst und 0.2/0.3 ausdrücklich historisiert.
- Build-Dokumentation um den expliziten macOS-Artefakt-Hinweis ergänzt.

## 0.8.13-h - Final RC Readiness und Release-Infrastruktur

- GitHub-Workflow `.github/workflows/build-release.yml` ergänzt: Tags `v*` erzeugen ein Draft Release mit Linux-, Windows- und unsigniertem macOS-Artefakt.
- Tag-/Package-Version-Abgleich im Release-Workflow ergänzt.
- `release:check` als verbindlicher lokaler RC-Gate-Befehl geschärft.
- Doku auf GitHub-Build, npm-/electron-builder-Warnungen, macOS unsigned und Service-Coverage-Gate aktualisiert.

## 0.8.13-g - Buildfix für Service-Behavior-Tests

- TypeScript-Buildfehler in den verhaltensprüfenden Security-Service-Tests behoben.
- TypeScript-Buildfehler in `caseNoteEntityLinkBehavior0813e.test.ts` behoben.

## 0.8.13-f - Service-Coverage und echte Unit-Tests

- Vitest-Coverage auf `provider: 'v8'` gesetzt.
- Coverage-Gate mit 70 Prozent für Branches, Functions, Lines und Statements gesetzt.
- Echte Behavior-/Unit-Tests für `securityService.ts`, `backupService.ts`, `terminationWorkflowPolicy.ts` und Retention-Lücken ergänzt.

## 0.8.13-e - Verhaltensprüfende Unit-Tests für RC-kritische Logik

- Ergänzt echte Unit-Tests mit definierten Eingaben und erwarteten Ergebnissen für Inlinebefehle, Prefill-Logik und Aktenbezug-Navigation.
- Positive und negative Testfälle prüfen Command-Boundaries, Argumentextraktion, Ersetzung und Prozess-Prefills.

## 0.8.13-d - RC-Review-Fixes: Typen, Modulgrenzen, Linkabdeckung und Coverage-Gate

- Lebende Protokollverknüpfungen auf `/praev`, `/kuend`, `/gleich` und `/anp` erweitert.
- TypeScript-Schnell-Casts in `ReportsView.tsx` und `useProcessTemplateActions.ts` entfernt.
- `src/vite-env.d.ts` importiert die `caseMeasures`-Typen vollständig.
- Coverage-Gate für die RC-Prüfung ergänzt.

## 0.8.13-c - Review-Fixes vor RC

- Frühphasen-Placeholder aus `docs/SECURITY.md` entfernt.
- Dashboard- und Settings-Komponenten aus `features/cases/` in semantisch passende Module verschoben.
- Roadmap-Stand und Security-Doku durch Guard-Tests abgesichert.

## 0.8.13-b - RC-Dateibereinigung

- Aktive Dokumentation auf dauerhafte RC-Unterlagen reduziert.
- Historische Patch-, Buildfix- und Zwischenstandsnotizen über den Source-Cleanup-Mechanismus zur Entfernung vorgemerkt.

## 0.8.13-a - RC-Readiness-Testfix

- RC-Readiness-Tests an tatsächliche Konstantennamen und dynamische E2E-IDs angepasst.
- BUILD-Dokumentation ergänzt: experimenteller macOS-Buildbefehl und Windows-`winCodeSign`-/Symlink-Hinweis.

## 0.8.13 - RC-Härtung

- README als öffentliche Projektstartseite für SBVen optimiert.
- E2E-, A11y-, Security-/Privacy- und Migrations-Readiness ergänzt.
- Doku für BUILD, E2E, RELEASE_CHECKLIST, SECURITY, ROADMAP, KNOWN_ISSUES und CHANGELOG aktualisiert.

## 0.8.12-j – Windows-Build ohne Symlink-Privileg

- Windows-RC-Build deaktiviert `signAndEditExecutable`, damit unsignierte Windows-Artefakte ohne `winCodeSign`-Symlink-Extraktion gebaut werden können.
- Native Dependency-Vertrag bleibt unverändert: `postinstall` ist exakt `electron-builder install-app-deps`.

## 0.8.12-i – Plattform- und versionsstabile Testguards

- BEM-Migrationstests verwenden jetzt eine gemeinsame Source-Text-Normalisierung und whitespace-tolerante SQL-Muster statt zeilenendensensitiver Snippets.
- Versionsnummern werden in Tests nicht mehr als stabiler Produktvertrag behandelt; erlaubt bleibt nur Konsistenzprüfung wie generierte Version gegen package.json.
- Source-Text-Guard erkennt nun auch unvollständige CRLF-Normalisierung und setzt auf `normalizeSourceText`.
- `postinstall` bleibt unverändert: `electron-builder install-app-deps`.

## 0.8.12-h – Testversionslabels entkoppelt

- Verbleibenden Testfehler aus `hotfixVersionGuards0812e.test.ts` behoben.
- Hotfix- und Build-Guard-Tests beschreiben jetzt technische Verträge ohne konkrete Versionslabels in `describe(...)`.
- Der Guard prüft weiterhin, dass relevante Tests nicht wieder an konkrete Hotfix-Versionen gekoppelt werden.
- Keine Schemaänderung.

## 0.8.12-g – Plattformunabhängige Tests

- Hotfix: BEM-Migrationstests normalisieren CRLF/LF-Zeilenenden, damit Windows-Checkouts mit `core.autocrlf` nicht scheitern.
- Neuer Guard verhindert zeilenendensensitive `indexOf`/`lastIndexOf`/`toContain`-Assertions auf mehrzeilige Source-Needles in Tests.
- Postinstall-Vertrag bleibt unverändert: `electron-builder install-app-deps`.

## 0.8.12-e – Hotfix für Hotfix-Versionsguards

## 0.8.12-f

- Keine Tests mehr auf konkrete `package.json`-Versionsnummern; geprüft werden nur noch technische Verträge.

- Hotfix: Versionsnummern werden in Tests nicht mehr als fachlicher Vertrag geprüft.
- Postinstall-Vertrag bleibt weiterhin direkt abgesichert: `electron-builder install-app-deps`.
- Obsolete Tests mit hart gepinnten historischen Hotfix-Versionen werden über den Source-Cleanup entfernt.


- Testguards aus 0.8.12-c und 0.8.12-d pinnen nicht mehr hart auf einen einzelnen Hotfix-Suffix.
- 0.8.12-Hotfixstände werden über ein gemeinsames Versionsmuster akzeptiert, ohne den Postinstall-Sicherheitsvertrag zu lockern.
- `postinstall` bleibt exakt `electron-builder install-app-deps`.

# Changelog

## 0.8.12-d – BEM-Migration-Fresh-Install-Hotfix

- `database/migrations/0015_bem_process.sql` enthält wieder explizit die minimale Dummy-Tabelle vor dem Rename, damit frische Installationen und frühe Legacy-Stände den robusten BEM-Migrationstest bestehen.
- Keine Schema-Erhöhung: Es handelt sich um die Korrektur einer bestehenden Migration im Patchstand, nicht um eine neue Produktmigration.
- `postinstall` bleibt unverändert auf `electron-builder install-app-deps`.

## 0.8.12-c – TypeScript-Build-Hotfix für Fallnotizlinks

- Fehlende Typimporte in `services/caseService.ts` ergänzt: `CaseNoteLinkRecord` und `CreateCaseNoteLinkInput` werden nun aus `case-note-link.model` importiert.
- Damit sind die nach vollständig grünem Vitest-Lauf auftretenden TypeScript-Fehler im Plattformbuild behoben.
- Keine Schemaänderung; `case_note_links` bleibt unverändert bei Schema `0024`.
- `postinstall` bleibt exakt `electron-builder install-app-deps`.

## 0.8.12-b – Test-Hotfix für Hotfix-Versionen

- Verbleibende Testfehler aus dem 0.8.12-a-Buildlauf behoben.
- Versionsprüfungen in Guard-Tests hotfixfähig gemacht, ohne den eigentlichen Sicherheitsvertrag aufzuweichen.
- Roadmap-Test an den erreichten Stand angepasst: 0.8.11 und 0.8.12 sind nicht mehr vor RC1 offen, sondern historisch abgeschlossen; die Konzeptreihenfolge bleibt dokumentiert.
- `postinstall` bleibt exakt `electron-builder install-app-deps`.


## 0.8.12-a – Windows-Source-Cleanup-Hotfix

- Windows-Buildfehler im Source-Cleanup behoben: Manifest-Pfade mit Backslashes werden vor der Top-Level-Prüfung stabil auf `/` normalisiert.
- `postinstall` bleibt als harter Vertrag gesetzt: `electron-builder install-app-deps`.
- Version und generierte Versionsdateien auf `0.8.12-a` aktualisiert.


## 0.8.12 – Lebende Protokollverknüpfungen MVP

- Persistente Tabelle `case_note_links` für interne Aktenbezüge aus Fallnotizen ergänzt.
- Inlinebefehle `/bem`, `/bet` und `/fr` merken die erzeugten Zielobjekte als strukturierte Notizlinks vor.
- Fallnotizen liefern Links mit fachlichem Label und Screenreader-Label aus; technische UUIDs bleiben interne Routingdaten.
- Notizansicht rendert Aktenbezüge als klickbare interne Links; fehlende Ziele werden deaktiviert angezeigt statt zu crashen.
- Audit für Linkanlage bleibt sparsam: Fall-ID, Notiz-ID, Zieltyp und Ziel-ID; keine sensiblen Freitexte.
- `postinstall` erneut hart abgesichert: exakt `electron-builder install-app-deps`, ohne `npx`.

## 0.8.11-d – Build-Ketten-Hotfix

- `prebuild` wieder auf den bestehenden Build-Readiness-Vertrag zurückgesetzt.
- Vitest-Suite in den normalen `npm run build`-Befehl verschoben, damit Plattformbuilds weiterhin vor der Kompilierung testen.
- Build-Integrationstest auf die neue Build-Kette angepasst.
- Obsoleten 0.8.11-c-Build-Integrationstest per Source-Cleanup entfernt, damit `vitest run` nicht gegen historische Erwartungen läuft.

## 0.8.11-c – Build-/Test-Hotfix

- Der normale Build-Lauf führt vor der Kompilierung jetzt die Vitest-Suite aus.
- Fehlende Props in `CasesViewRender` für Fallregister-Paging und Prozessanlage korrigiert.
- Build-Integrationsprüfung für die 0.8.11-CasesView-Extraktion ergänzt.

## 0.8.11-b - Build- und Test-Hotfix

- TypeScript-Fehler aus der 0.8.11-a-Aufteilung behoben: fehlende Imports, zu frühe Verwendung der Dokumentaktionen und fehlende Render-Props korrigiert.
- CaseWorkbench-Regressionstest an die neue Render-Aufteilung angepasst.
- Verwaiste npm-Testskripte entfernt, die nach Source-Cleanup auf nicht mehr vorhandene historische Strukturtests zeigten.
- Keine Schemaänderung, keine neue Fachlogik.

## 0.8.11-a - Clean-Code-Hotfix CasesView

- CasesView nach der 0.8.11-Entkernung weiter in fokussierte Feature-Module aufgeteilt.
- Settings-, Render-, Prozess-, Vorlagen- und CRUD-Aktionen aus dem ehemaligen Monolithen herausgelöst.
- Historische Tests, die nach der Entkernung weiterhin Implementierungsdetails in `workflowViews.tsx` erwarteten, werden über den Source-Cleanup-Mechanismus entfernt.
- Versions- und Roadmap-Readiness-Tests an Hotfix-Versionen und die verbindliche Konzeptreihenfolge angepasst.


## 0.8.11

- `workflowViews.tsx` vollständig entkernt; die Datei enthält nur noch Re-Exports.
- Die bisherige Fallakten-/Workflow-Implementierung wurde in `src/app/features/cases/CasesView.tsx` verschoben.
- Zielstruktur für die Fallaktenansicht ergänzt: `CasesViewLayout.tsx`, `CasesViewHeader.tsx`, `CasesViewToolbar.tsx`, `casesViewTypes.ts` und `casesViewUtils.ts`.
- Fallakten-Paging-Hilfslogik in `casesViewUtils.ts` gekapselt und typisierte `CasesViewProps` ergänzt.
- Keine Datenbankmigration und keine fachliche Logikänderung.

## 0.8.10

- WorkplaceAccommodationView nutzt jetzt `useAnnouncer` für die nutzerinitiierte Öffnung von Arbeitsplatzgestaltungsmaßnahmen.
- ParticipationView hebt `pflichtverstoss_dokumentiert` als juristische Warnlage nach § 178 Abs. 2 Satz 1 SGB IX hervor.
- Die App formuliert keine automatische Unwirksamkeit, sondern verweist auf die Prüfung möglicher Rechtsfolgen einschließlich Aussetzung/Nachholung nach § 178 Abs. 2 Satz 2 SGB IX, Dokumentation und Einschaltung des Inklusionsamts.
- ROADMAP.md in die Struktur aktueller Stand, vor RC1 offen, nach RC1, später/1.x und historisch abgeschlossen überführt.
- Veraltete historische Readiness-/E2E-Testreste werden per Source-Cleanup bereinigt; Vitest klammert echte Playwright-E2E-Specs aus.
- `postinstall` bleibt explizit bei `electron-builder install-app-deps`, damit native Abhängigkeiten zur Electron-Version passen.

## 0.8.9

- Entsperrschutz ergänzt: gestufte, rein speicherbasierte Pause nach falschen Tresorpasswörtern; kein permanenter Lockout.
- Erfolgreicher Passwort-Unlock und Recovery-Unlock setzen den Fehlversuchszähler zurück.
- Neue Backups verwenden gehärtete scrypt-Parameter (`N=131072, r=8, p=1`) und schreiben die KDF-Parameter in den Backup-Envelope.
- Restore/Inspect unterstützt weiterhin Legacy-Backups ohne `kdfParams` mit Fallback auf `N=32768, r=8, p=1`.
- Security- und Backup-Readiness-Tests für 0.8.9 ergänzt.

## 0.8.8-g

- Playwright-basierte E2E-Smoke-Testbasis ergänzt.
- E2E-Runner erzeugt pro Lauf eine eigene temporäre Testumgebung und setzt `GREMIA_SBV_DATA_DIR` ausschließlich auf dieses Verzeichnis.
- Schutzabbruch eingebaut, falls ein E2E-Datenverzeichnis nicht unter dem System-Temp mit Präfix `gremia-sbv-e2e-` liegt.
- Browser-E2E-Tests nutzen synthetische Bridge-Daten statt produktiver SBV-Daten.
- Smoke-Tests für App-Start, Fallakte, Kurzbefehls-Hilfe und Compliance-Farbschema ergänzt.
- Containerlauf über `Dockerfile.e2e` vorbereitet.

## 0.8.8-f

- Compliance Center trennt technische Statusprüfung von organisatorischen Datenschutz-Prüfpunkten.
- Gesamtampel für Datenschutzstatus entfernt.
- Dark-/Lightmode-Styles des Compliance-Statusbereichs korrigiert.

## 0.8.8-d

- README zu einer GitHub-tauglichen Projekt-README umgebaut.
- Dokumentationsbestand geprüft und historische Patch-/Buildfix-Notizen aus dem aktiven Bestand entfernt.
- `docs/README.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `RELEASE_CHECKLIST.md` und `DOCUMENTATION_AUDIT_0_8_8_D.md` ergänzt.
- Source-Cleanup-Ausgabe korrigiert: bereits entfernte Dateien werden nicht mehr als „nicht vorhanden“, sondern als „bereits bereinigt“ behandelt.
- Die lange Test-Cleanup-Liste aus 0.8.8-c wurde durch ein leeres Abschlussmanifest ersetzt, um wiederholte Build-Ausgaben zu beruhigen.

## 0.8.8

- Build-Readiness-Guard ergänzt.
- `postinstall` mit `electron-builder install-app-deps` ergänzt.
- Native Electron-Abhängigkeiten werden nach Installation passend eingerichtet.

## 0.8.7

- Datenschutzstatus und 1.0-Compliance-Vorbereitung im Compliance Center ergänzt.
- Source-Cleanup-Mechanismus eingeführt.

## 0.8.6

- Arbeitsplatzgestaltung als Fallaktenmaßnahme ergänzt.
- Inlinebefehle vereinheitlicht.
- Maßnahmenbezogene Fristen und Dokumente vorbereitet.

## 0.8.5

- Fallaktenzentrierte Maßnahmenarchitektur eingeführt.
- SBV-Beteiligung aus dem isolierten Modul in die Fallakte überführt.
- Berichtswesen und Vorlagenlayout konsolidiert.

## 0.8.4

- Versionen, Schema, PDF-Erzeugung, Audit-Hash-Chain, Auto-Lock, temporäre Dateien und IPC-Validierung stabilisiert.
