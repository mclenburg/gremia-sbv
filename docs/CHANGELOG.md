## 0.8.13-l - Lizenzfestlegung und RC-Testfix

- Projektlizenz auf `AGPL-3.0-or-later` festgelegt und in `package.json`, `LICENSE`, `NOTICE` und `docs/LICENSE_POLICY.md` dokumentiert.
- README um einen öffentlichen Lizenzabschnitt ergänzt.
- Veralteten Guard-Test `equalizationTemplateStatus061d.test.ts` an die aktuelle diskriminierte Union in `ProcessTemplateDocumentsModal.tsx` angepasst. Der Test erwartet keine alten Type-Guard-Funktionen mehr und prüft stattdessen typensichere Statusbehandlung ohne `as any`.
- Doku-Stände und RC-Dokumentation konsistent auf 0.8.13-l gezogen.
- Keine Schemaänderung und keine neue Fachlogik.

## 0.8.13-l - Finaler RC-Quality-Gate- und Typensicherheitsfix

- `coverage.enabled: false` aus `vitest.config.ts` entfernt, damit `vitest run --coverage` das eingeforderte V8-Service-Coverage-Gate nicht deaktiviert.
- `ProcessTemplateDocumentsModal.tsx` auf eine diskriminierte Union für Prozessarten umgestellt.
- Die letzten `as any`-Casts bei Prozessstatus-Labels entfernt.
- Doku-Stände und RC-Dokumentation konsistent auf 0.8.13-l gezogen.

## 0.8.13-l - RC-Test- und Doku-Konsistenzfix

- Veraltete historische Readiness-Tests auf den aktuellen RC-Vertrag angepasst.
- `release:check` wird nun korrekt mit Service-Coverage-Gate erwartet.
- Roadmap-Guards an den aktuellen historischen Stand angepasst und 0.2/0.3 ausdrücklich historisiert.
- Build-Dokumentation um den expliziten macOS-Artefakt-Hinweis ergänzt.
- Keine Schemaänderung.

# CHANGELOG

## 0.8.13-l - Final RC Readiness und Release-Infrastruktur

- GitHub-Workflow `.github/workflows/build-release.yml` ergänzt: Tags `v*` erzeugen ein Draft Release mit Linux-, Windows- und unsigniertem macOS-Artefakt.
- Tag-/Package-Version-Abgleich im Release-Workflow ergänzt.
- `release:check` als verbindlicher lokaler RC-Gate-Befehl geschärft: `rc:check`, Service-Coverage und Build werden gebündelt.
- Doku-Stände und RC-Dokumentation konsistent auf 0.8.13-l gezogen.
- `docs/BUILD.md`, `docs/RELEASE_CHECKLIST.md`, `docs/KNOWN_ISSUES.md` und `docs/ROADMAP.md` auf GitHub-Build, npm-/electron-builder-Warnungen, macOS unsigned und Service-Coverage-Gate aktualisiert.
- Release-Infrastruktur-Tests für GitHub-Workflow, Doku-Konsistenz und Dependency-Warnungs-Readiness ergänzt.
- Keine Schemaänderung und keine neue Fachlogik.

## 0.8.13-l - Buildfix für Service-Behavior-Tests

- TypeScript-Buildfehler in den verhaltensprüfenden Security-Service-Tests behoben: der Test-Spy für die interne Vault-DB-Initialisierung wird nicht mehr als Schnittmengen-Typ mit privater Methode modelliert.
- `securityServiceBehavior0813f.test.ts` bleibt ein echter Behavior-Test gegen `SecurityService`: Unlock positiv/negativ, Unlock-Delay, Recovery-Key, Passwortwechsel und destruktiver Reset werden weiterhin mit definierten Eingaben und erwarteten Ergebnissen geprüft.
- TypeScript-Buildfehler in `caseNoteEntityLinkBehavior0813e.test.ts` behoben: die Prozessauswahl wird vor Zugriff auf `id` explizit typverengt.
- Keine Schemaänderung. Coverage-Konfiguration mit V8-Provider und 70-Prozent-Schwellen für `services/**/*.ts` bleibt unverändert.

## 0.8.13-l - Service-Coverage und echte Unit-Tests

- Vitest-Coverage auf `provider: 'v8'` und Service-Schicht `services/**/*.ts` begrenzt.
- Coverage-Gate mit 70 Prozent für Branches, Functions, Lines und Statements gesetzt.
- Echte Behavior-/Unit-Tests für `securityService.ts`, `backupService.ts`, `terminationWorkflowPolicy.ts` und Retention-Lücken ergänzt.
- Backup-Tests prüfen aktuelle KDF-Parameter und Legacy-Restore ohne `kdfParams`.
- Security-Tests prüfen Unlock positiv/negativ, Unlock-Delay, Recovery-Key, Passwortwechsel und destruktiven Reset.

# CHANGELOG

## 0.8.13-l - Verhaltensprüfende Unit-Tests für RC-kritische Logik

- Ergänzt echte Unit-Tests mit definierten Eingaben und erwarteten Ergebnissen für Inlinebefehle, Prefill-Logik und Aktenbezug-Navigation.
- Positive und negative Testfälle prüfen u. a. Command-Boundaries, Argumentextraktion, Ersetzung, Präventions-/Kündigungs-/Gleichstellungs-/Arbeitsplatzanpassungs-Prefills sowie Beteiligungs-Klassifikation.
- `CaseNoteEntityLinks` exportiert die bisher interne Link-zu-Auswahl-Logik, damit Prozessnavigation und fachliche Labels direkt getestet werden können.
- Neues Script `npm run test:rc-behavior-0813e` bündelt die verhaltensprüfenden RC-Unit-Tests.
- Keine Schemaänderung; bestehende Coverage- und Struktur-Guards bleiben erhalten, ersetzen aber nicht die neuen Logiktests.

## 0.8.13-l - RC-Review-Fixes: Typen, Modulgrenzen, Linkabdeckung und Coverage-Gate

- Lebende Protokollverknüpfungen auf `/praev`, `/kuend`, `/gleich` und `/anp` erweitert; die RC-kritischen Fallaktenbefehle `/bem`, `/praev`, `/bet`, `/kuend`, `/gleich`, `/anp` und `/fr` erzeugen damit einheitlich klickbare Aktenbezüge.
- TypeScript-Schnell-Casts in `ReportsView.tsx` und `useProcessTemplateActions.ts` entfernt; die vorhandenen Bridge- und Dialogtypen werden wieder direkt genutzt.
- `src/vite-env.d.ts` importiert die `caseMeasures`-Typen vollständig.
- Coverage-Gate für die RC-Prüfung ergänzt: `vitest.config.ts` enthält 70-Prozent-Schwellen für Lines, Functions, Branches und Statements; `npm run test:coverage` führt die Coverage-Prüfung aus.
- Modulgrenzen für Dashboard/Settings bleiben über den Source-Cleanup und Boundary-Tests abgesichert.

## 0.8.12-j – Windows-Build ohne Symlink-Privileg
## 0.8.13-l - Review-Fixes vor RC

- Frühphasen-Placeholder aus `docs/SECURITY.md` entfernt und Plattformintegration als RC-geprüften Build-/Readiness-Vertrag beschrieben.
- Dashboard- und Settings-Komponenten aus `features/cases/` in semantisch passende Module verschoben.
- `workflowViews.tsx` bleibt als öffentlicher Kompatibilitätsindex erhalten, re-exportiert aber Dashboard, Settings und Theme aus den richtigen Modulbereichen.
- `docs/ROADMAP.md` auf den aktuellen Stand gehoben und um die bewusste MVP-Grenze der lebenden Protokollverknüpfungen ergänzt.
- Lebende Protokollverknüpfungen auf `/praev`, `/kuend`, `/gleich` und `/anp` erweitert; die RC-kritischen Fallaktenbefehle `/bem`, `/praev`, `/bet`, `/kuend`, `/gleich`, `/anp` und `/fr` erzeugen damit einheitlich klickbare Aktenbezüge.
- RC-Review-Tests für Modulgrenzen, Roadmap-Stand und Security-Doku ergänzt.


## 0.8.13-l – RC-Dateibereinigung

- aktive Dokumentation auf dauerhafte RC-Unterlagen reduziert.
- historische Patch-, Buildfix- und Zwischenstandsnotizen über den Source-Cleanup-Mechanismus zur Entfernung vorgemerkt.
- altes `cleanup:legacy`-Skript aus den npm-Skripten entfernt; Dateibereinigung läuft im Build über manifestgesteuerten `source:cleanup`.
- Guard-Test ergänzt, damit kurzlebige Patchdokumente und verwaiste Legacy-Cleanup-Skripte vor RC1 nicht erneut im aktiven Bestand auftauchen.

## 0.8.13-l

- RC-Readiness-Tests an die tatsächlichen Konstantennamen und dynamischen E2E-IDs angepasst.
- BUILD-Dokumentation ergänzt: experimenteller macOS-Buildbefehl und Windows-`winCodeSign`-/Symlink-Hinweis.
- Security-/Privacy-Readiness prüft technische Verträge statt redaktioneller Testphrasen.


- Windows-RC-Build deaktiviert `signAndEditExecutable`, damit unsignierte Windows-Artefakte ohne `winCodeSign`-Symlink-Extraktion gebaut werden können.
- Hintergrund: Auf Windows-Systemen ohne Entwickler-Modus oder Administratorrecht scheitert `winCodeSign-2.6.0.7z` beim Entpacken der enthaltenen macOS-Symlinks.
- Trade-off: EXE-Resource-Editing wie Datei-Metadaten/Icon am Executable wird für den unsignierten RC-Build nicht durchgeführt; NSIS/Portable-Artefakte bleiben buildbar.
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

## 0.8.13 - RC-Härtung

- Root-README als öffentliche Projektstartseite für Schwerbehindertenvertretungen optimiert.
- RC-Build-/Testmatrix für Linux und Windows dokumentiert.
- E2E-Responsive-Test für mehrere Desktop-Auflösungen ergänzt.
- E2E-Barrierefreiheitstest für Tastatur, Dialoge und fachliche Labels ergänzt.
- Plattformstabilitäts-, Accessibility-, Security-/Privacy-, Migrations- und README-Readiness-Tests ergänzt.
- RC-kritische data-e2e-Selektoren stabilisiert.
- Native-Dependency-Vertrag `postinstall: electron-builder install-app-deps` bleibt blockierend abgesichert.



## 0.8.13-l – Dependency Registry Readiness und Node-Build-Basis

- package-lock.json von internen Registry-/Artifactory-URLs bereinigt.
- Projekt-`.npmrc` auf öffentliche npm Registry gesetzt.
- Node-Build-Basis auf Node.js >=20.19.0 dokumentiert und über `engines`, `.nvmrc` und `.node-version` abgesichert.
- Dependency-Readiness-Test ergänzt, damit interne Registry-URLs und Node-18-Builds nicht als RC-Stand durchrutschen.
