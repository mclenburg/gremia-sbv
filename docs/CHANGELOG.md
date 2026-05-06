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
