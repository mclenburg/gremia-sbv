# Architekturüberblick

Gremia.SBV ist eine lokale Electron-/React-Anwendung mit verschlüsseltem Datenbestand. Die Architektur ist darauf ausgelegt, sensible SBV-Daten lokal zu halten und fachliche Funktionen klar zu trennen.

## Leitentscheidungen

1. **Offline-first bleibt Standard.** Netzwerkzugriffe sind optional, explizit und fachlich begrenzt.
2. **SQLCipher-Vault ist die zentrale Datenhaltung.** Keine sensiblen Fachdaten in localStorage.
3. **Renderer ist nicht vertrauenswürdig genug für Secrets.** Datenbank-, Datei- und Netzwerkzugriffe laufen über Services.
4. **Bridge statt Direktzugriff.** Der Renderer nutzt typisierte IPC-/Preload-Funktionen.
5. **Module liefern Fachlogik, Services sichern Querschnitt.** Datenschutz, Suche, Audit, Retention und Dokumente sind eigene Bausteine.

## Grobe Schichten

```text
React UI
  ↓
Preload / typisierte Bridge
  ↓
IPC Handler
  ↓
Services
  ↓
Repositories / SQLCipher / Dateivault
```

## Wichtige Querschnittsdienste

### Datenschutz und Retention

Anonymisierung, Löschung, Retention, Privacy Review und Audit dürfen nicht nebeneinander existieren, sondern müssen dieselben Entitäten kennen. Wird eine Fallakte anonymisiert oder gelöscht, müssen auch Dokumente, Maßnahmennotizen, Suchindex und externe Referenzen folgen.

### Suchindex

Die Suche nutzt einen zentralen Suchindex im SQLCipher-Vault. Fachmodule liefern indexierbare Inhalte über Provider. Der Suchindex enthält sensible Kopien von Textinhalten und ist daher selbst datenschutzrelevant.

### Dokumentverarbeitung

Dokumente werden lokal gespeichert. Text-Extraktion und optional OCR laufen lokal. Cloud-OCR oder externe Dokumentdienste sind nicht Teil der Architektur.

### Fallübergabe / Vertretung

Die Fallübergabe ist ein eigenständiger, verschlüsselter Transferpfad für ausgewählte Fallakten. Sie ist kein Backup und keine Synchronisation. Exportierte Paket-Referenzen stellen nur Beziehungen innerhalb des Übergabepakets wieder her; beim Import entstehen lokale IDs der importierenden Instanz.

Die Importentscheidung bleibt fachlich bei der nutzenden Person. Mögliche Gegenstücke können vorgeschlagen werden, aber es gibt keine stille Zusammenführung. Ablaufdatum, Importablehnung abgelaufener Pakete und begründungspflichtige Weiterbearbeitung bereits importierter abgelaufener Daten sind Teil der Fachlogik.

### Gremia.BR-Lesebrücke

Die Gremia.BR-Anbindung ist optional, standardmäßig deaktiviert und read-only. Sie nutzt eine harte Endpunkt-Whitelist, speichert Zugangsdaten im Vault und führt Netzwerkzugriffe nur auf explizite Nutzeraktion aus. Der lokale Lesecache ist auf 30 Tage begrenzt und wird bei deaktivierter Anbindung geleert.

Die freigegebenen Gremia.BR-Endpunkte werden zentral in `services/gremiaBr/gremiaBrApiCatalog.ts` gepflegt. Policy, HTTP-Client, Audit-Label und ReadAdapter dürfen keine eigenen Nebenlisten aufbauen. Neue Lesemöglichkeiten aus der OpenAPI werden erst dort begründet aufgenommen, bevor ein Adapter sie nutzt. Schreib-, Verwaltungs-, DSGVO-, Mitglieder-, Abwesenheits-, Datei- und Upload-Pfade bleiben für Gremia.SBV gesperrt.



## Beteiligungsverstoß als Eskalation zur SBV-Beteiligungsmaßnahme

Der Beteiligungsverstoß ist kein eigenständiger Ersatzprozess neben der Fallakte. Fachlicher Standardanker ist die konkrete SBV-Beteiligungsmaßnahme in der Maßnahmenarchitektur:

```text
case_measures.type = 'sbv_participation'
case_measure_participation.measure_id = case_measures.id
sbv_participation_violations.source_context_type = 'case_measure_participation'
sbv_participation_violations.related_case_measure_id = case_measures.id
```

Die zentrale Verstoßübersicht dient Suche, Nachverfolgung, Auswertung und bewusster Sonderanlage. Der normale Anlageweg startet aus der geöffneten SBV-Beteiligungsmaßnahme. Dadurch bleibt der Beteiligungsverstoß eine dokumentierte Rüge- und Eskalationsspur zu einer konkreten Beteiligungsprüfung nach § 178 Abs. 2 Satz 1 und Satz 2 SGB IX.

Verbindliche Grenzen:

- kein automatischer erster Fall als Default,
- kein leerer Journal-Kontext als Fallback,
- keine stille Persistenz durch Öffnen einer Fallakte oder Maßnahme,
- keine Klarnamen-, Diagnose-, GdB- oder Gesundheitsdatenübernahme in Schreiben,
- keine automatische Arbeitgeberkommunikation,
- Legacy-Kontext `sbv_participation` bleibt nur für Altbestand.

Servicevalidierung und UI-Validierung verfolgen unterschiedliche Zwecke. Der Main-Prozess bleibt die harte Sicherheitsinstanz für Kontext, Fallableitung und Relationen. Die Renderer-Validierung dient Bedienbarkeit, früher Fehlererkennung und Barrierefreiheit.

## UI-Zentralisierung und Architektur-Gates

Für UI-Arbeit gilt: Fachmodule bauen keine Standard-Shells, Panels, Buttons, Formulare, Badges, Dialoge, Empty-States, Suchleisten oder Tabellen mehr lokal nach. Vor einer neuen UI-Struktur ist zuerst die zentrale Schicht unter `src/app/shared/components`, `src/app/shared/dialogs` und `src/app/ui/` zu prüfen.

Verbindliche Bausteine:

- `WorkbenchPage`, `WorkbenchWorkspace`, `WorkbenchHeader`, `WorkbenchToolbar`, `WorkbenchSidebar`, `WorkbenchContent`
- `IndustrialPanel`, `IndustrialRecordCard`, `IndustrialSelectionCard`, `IndustrialStatusCard`, `IndustrialWarningPanel`, `IndustrialDangerPanel`
- `IndustrialButton`, `ToolbarButton`, `DangerButton`, `GhostButton`, `IconButton`, `ButtonGroup`
- `FormSection`, `FormField`, `TextInput`, `TextareaInput`, `SelectInput`, `DateInput`, `DateTimeInput`, `PasswordInput`, `CheckboxField`, `FormActions`
- `StatusBadge`, `RiskBadge`, `DeadlineBadge`, `ComplianceBadge`, `ProcessStatusBadge`
- `IndustrialModal`, `ConfirmDialog`, `DestructiveConfirmDialog`, `ReasonRequiredDialog`, `PassphraseDialog`, `ExportResultDialog`
- `SearchToolbar`, `FilterBar`, `RecordList`, `DataTable`, `EmptyState`

Für neue Features bedeutet das: Erst zentrale Komponente nutzen, dann fachliche Abweichung klein begründen und testen. Neue modulnahe CSS-Dateien, direkte Feature-CSS-Imports und lokale Nachbauten zentraler Industrial-/Workbench-Klassen sind nicht zulässig. Native Formularfelder oder Buttons in Feature-Views sind nur noch erlaubt, wenn ein bestehendes zentrales Pattern technisch nicht passt und der Architekturtest dafür bewusst erweitert wird.


### Visuelles QA-Gate

Das visuelle E2E-Gate `npm run test:e2e:visual` prüft die primären Arbeitsbereiche in Light- und Dark-Mode, verhindert dunkle Light-Mode-Restflächen, helle Dark-Mode-Leaks, runde überrundete Pill-Badges und systemfremde Control-Flächen. Details stehen in `docs/UI_VISUAL_QA.md`.

## Dashboard-Prinzip

Das Dashboard ist keine Werbefläche für Module. Es zeigt nur Bereiche mit unmittelbarem Arbeitswert:

- Fälle,
- Fristen,
- Compliance-Center,
- Gremia.BR-Lesebrücke.

Alles andere gehört in die Fachmodule.
### UI-Core-Verhaltenstests

Zusätzlich zu Architektur-Gates und visueller QA beschreibt `docs/UI_CORE_BEHAVIOR_QA.md` die verpflichtenden Bedienflussverträge für zentrale Dialoge, Formulare, Textareas, Screenreader-Live-Regionen und Exportfeedback.


## Qualitätsvertrag

Die verbindliche Qualitätsfreigabe-Linie ist in `docs/QUALITY_GATE.md` dokumentiert. Für neue Module gilt: Views orchestrieren, State liegt in Hooks, UI in kleinen Komponenten, Fachlogik in Logic-/Utility-Dateien. Zentrale UI-Komponenten, Audit-Builder, Live-Regionen und Light-/Dark-Mode-Verträge sind verbindlich.

## SBV-Steuerungsprotokolle ohne Fallzuordnung

Die SBV-Steuerung enthält neben Nachweisen zu Schulung, Heranziehung und Sachmitteln einen eigenen Bereich für übergreifende Steuerungsprotokolle. Diese Protokolle sind bewusst nicht an eine Fallakte gebunden. Sie dienen der Dokumentation von Gesprächen mit Arbeitgeber, Betriebsrat oder gemeinsamen Runden zu betrieblichen Regelungen, Inklusionsvereinbarung, Barrierefreiheit, Beteiligungsverfahren und sonstigen Grundsatzthemen.

Datenschutzfachlich ist der Bereich von Fallakten getrennt: Ein Steuerungsprotokoll darf keine ärztlichen Details, Diagnosen oder Einzelfallunterlagen aufnehmen. Personenbezüge sind auf das für Rollen, Teilnehmende und Nachverfolgung erforderliche Maß zu beschränken. Die Auditierung protokolliert nur Aktion, Status und Themenkategorie, nicht den Inhalt des Protokolls.

## Startpfad und erste sichtbare Rückmeldung

Der Electron-Einstieg `electron/main.ts` ist ein bewusst schlanker Bootstrap. Er darf keine Fachservices, IPC-Module, SQLCipher-/Vault-Services, Demo-Seed-Logik oder Dateisystem-Resolver der Anwendung top-level importieren. Seine Aufgabe ist nur: Single-Instance-Schutz setzen, nach `app.whenReady()` ein minimales Splash-Fenster sofort sichtbar öffnen und erst danach die eigentliche Laufzeit über `electron/appRuntime.ts` dynamisch nachladen. Der Splash wartet nicht mehr auf `ready-to-show` oder auf das vollständige Laden des Inline-HTML; die erste sichtbare Reaktion ist das Fenster selbst mit dunklem Hintergrund; damit erhält die Nutzerin sofort eine sichtbare Rückmeldung.

Die schwere Initialisierung liegt in `electron/appRuntime.ts`: Sicherheitsrichtlinien, Datenverzeichnis, `SecurityService`, IPC-Registrierungen und das eigentliche Anwendungsfenster werden erst ausgeführt, wenn der Splash bereits sichtbar ist. Das Hauptfenster wird spätestens nach Renderer-Load sichtbar gemacht; erst danach wird die Demo-Vault-Erzeugung verzögert im Hintergrund gestartet. Während dieser kurzen Phase meldet die Sicherheitsbrücke einen gesperrten, initialisierten Demo-Tresor und blockiert Entsperrversuche mit einem klaren Wartehinweis. Dadurch bleibt die normale Produktivinitialisierung streng, während der Demo-Start nicht mehr das erste App-Fenster verzögert.

Für lokale Diagnose kann `GREMIA_SBV_STARTUP_TIMING=1` gesetzt werden. Dann schreibt die App eine lokale Start-Timeline in die Konsole: Bootstrap-Modul, Electron-Ready, Splash-Sichtbarkeit, Runtime-Import, SecurityService, IPC-Registrierung, Renderer-Load, Hauptfenster-Sichtbarkeit und nachgelagerte Demo-Vault-Bereitstellung. Diese Messpunkte sind keine Telemetrie und verlassen das Gerät nicht.

## Tätigkeitsbericht und Maßnahmen-Lifecycle

Für Maßnahmenstatistiken existiert genau ein Auswertungspfad:

`Fachservice → MeasureLifecycleAuditService → Audit-HashChain → ActivityReportProjectionService → ReportService`

Der Audit-Zwecktext ist keine maschinelle Datenquelle. Berichtsfähige Merkmale werden ausschließlich über die freigegebenen, versionierten Lifecycle-Metadaten verarbeitet. Neue Maßnahmentypen und Ereignisse müssen zentral typisiert, datenschutzgeprüft und durch Verhaltenstests abgesichert werden. Physische Löschungen berichtsfähiger Maßnahmen sind zusammen mit dem Lifecycle-Ereignis atomar auszuführen.

## Zentrale Service-Komposition im Electron-Hauptprozess

Der Electron-Hauptprozess besitzt mit `electron/applicationServices.ts` eine zentrale Composition Root für Anwendungsservices. IPC-Module erzeugen keine Fachservices mehr selbst, sondern erhalten die bereits zusammengesetzte Service-Registry aus `appRuntime`.

Services mit dynamischem Datenbankbezug werden je aktiver `DatabaseAdapter`-Instanz genau einmal erzeugt. Ein gesperrter und erneut geöffneter oder gewechselter Tresor erhält dadurch einen getrennten Service-Scope. Provider-basierte Services, die die aktive Datenbank erst beim Methodenaufruf auflösen, werden als stabile Laufzeitinstanzen gehalten.

Die Composition Root verändert keine fachlichen Zuständigkeiten und führt keine Migrationen aus. Schema- und Baseline-Nebenwirkungen bestehender Servicekonstruktoren werden in einem gesonderten Architekturvorhaben aus den Fachservices entfernt. Bis dahin verhindert die zentrale Instanzverwaltung zumindest, dass solche Konstruktoren bei jedem IPC-Aufruf erneut ausgeführt werden.

Neue IPC-Funktionen beziehen benötigte Services grundsätzlich aus `ApplicationServices`. Direkte `new ...Service(...)`-Aufrufe in IPC-Modulen sind nicht vorgesehen. Ausgenommen sind kurzlebige technische Adapter, die keine Datenbankschemata oder Fachdaten verändern.


## Datenbankinitialisierung und Service-Lebenszyklus

Nach dem Öffnen eines Tresors führt `SecurityService` zuerst alle versionierten SQL-Migrationen aus. Anschließend übernimmt `DatabaseRuntimeInitializer` einmalig die noch erforderlichen Kompatibilitätsprüfungen und die datensparsame Lifecycle-Baseline. Erst danach dürfen Fachservices verwendet werden.

Fachservice-Konstruktoren sind nebenwirkungsfrei: Sie führen weder SQL aus noch erzeugen sie Baseline- oder Audit-Einträge. Die zentrale `ApplicationServices`-Composition-Root verwaltet danach genau eine Instanz je Servicetyp und aktiver Datenbank. Dadurch sind Initialisierung, Migration und laufende Fachlogik voneinander getrennt.

## Transaktions- und Nebenwirkungsmodell

Fachliche Schreibvorgänge bilden eine explizite Unit of Work. Der fachliche Datensatz, das strukturierte Maßnahmen-Lifecycle-Ereignis und das verpflichtende Änderungs-Audit werden in derselben Datenbanktransaktion geschrieben. Scheitert einer dieser Schritte, wird der gesamte Vorgang zurückgerollt.

Lesende Zugriffs-Audits bleiben bewusst fehlertolerant: Ein vorübergehend nicht schreibbares Zugriffsprotokoll darf die Anzeige bereits vorhandener Daten nicht verhindern. Änderungs-Audits sind dagegen Bestandteil der fachlichen Konsistenz und dürfen nicht stillschweigend verworfen werden.

Rekonstruierbare Projektionen gehören nicht in die fachliche Transaktion. Insbesondere Suchindex-Aktualisierungen erfolgen erst nach dem Commit. Ein Fehler des Suchindex darf deshalb keine bereits konsistent gespeicherte Fachänderung zurückrollen; der Index kann vollständig aus den Fachdaten neu aufgebaut werden.

## Injizierte Kernabhängigkeiten der Maßnahmenservices

Die transaktionskritischen Maßnahmenservices erzeugen Audit-, Lifecycle-, Frist- und Suchindexdienste nicht mehr innerhalb ihrer Fachmethoden. `ApplicationServices` stellt diese Abhängigkeiten pro aktiver Datenbank einmalig bereit und injiziert dieselben Instanzen in BEM, Prävention, Gleichstellung, Kündigungsanhörung, Stellenbesetzung und allgemeine Fallmaßnahmen.

Dadurch entscheidet ausschließlich die Composition Root über die konkrete Serviceverdrahtung. Fachservices bleiben für isolierte Tests weiterhin direkt konstruierbar; ihre optionalen Standardabhängigkeiten sind ein Kompatibilitätspfad und werden im produktiven Electron-Hauptprozess nicht verwendet. Neue produktive Fachservices dürfen keine konkreten Folgeservices innerhalb von Fachmethoden erzeugen, wenn diese an Auditierung, Transaktionen, Lifecycle oder rekonstruierbare Projektionen beteiligt sind.

## Zentrale Datenbankinitialisierung

Nach dem Öffnen eines Tresors führt `DatabaseRuntimeInitializer` sämtliche noch erforderlichen Kompatibilitätsinitialisierungen genau einmal aus. Dazu gehören auch die Schemata für Fallakten/FTS, Suche, Berichte, Vorlagen, Kontakte, Wissensdatenbank, Datenschutzprüfungen, Aufbewahrung, Fallübergaben und Dokument-OCR.

Produktive Fachmethoden dürfen keine Tabellen, Spalten, virtuellen Tabellen oder Indizes erzeugen oder verändern. Sie arbeiten ausschließlich gegen das nach Migration und Initialisierung vollständig verfügbare Schema. Ein fehlendes Schema ist damit ein Start-/Migrationsfehler und wird nicht mehr während einer Nutzeraktion still repariert.

## Verbindliches Schreib- und Auditmodell

Fachliche Schreibvorgänge werden gemeinsam mit ihren verpflichtenden Audit- und Verknüpfungsschritten in einer `DatabaseUnitOfWork` ausgeführt. Die Unit of Work verwendet verschachtelbare SQLite-Savepoints, damit transaktionale Fachservices gefahrlos andere transaktionale Services aufrufen können.

- Änderungs-Audits sind verpflichtend und dürfen nicht still verworfen werden.
- Reine Lese-Audits bleiben bewusst fehlertolerant.
- Rekonstruierbare Projektionen und Dateisystem-Aufräumarbeiten dürfen nach dem Commit beziehungsweise als ausdrücklich best-effort markierte Nebenwirkung laufen.
- Ein fehlgeschlagenes Pflicht-Audit führt zum Rollback des gesamten fachlichen Schreibvorgangs.

## Versionierte Schemaquelle

Strukturelle Datenbankänderungen werden ausschließlich durch `MigrationService`
ausgeführt. SQL-Dateien unter `database/migrations` bilden die geordnete
Versionsfolge. Für historisch gewachsene, idempotente Kompatibilitätslogik gibt
es seit Schema 0049 einen an die jeweilige SQL-Migration gebundenen
`SchemaMigrationHook`.

Der Hook 0049 führt die verbliebenen Kompatibilitätsschemata innerhalb derselben
Migrationstransaktion aus und protokolliert jede Komponente in
`schema_migration_components`. `DatabaseRuntimeInitializer` ist danach strikt
auf Dateninitialisierung beschränkt: Referenzdaten und Lifecycle-Baselines. Er
darf keine Tabellen, Spalten oder Indizes erzeugen oder verändern.

Damit gilt beim Start:

1. Basisschema beziehungsweise versionierte SQL-Migrationen,
2. versionsgebundene Schema-Hooks,
3. vollständige Schema-Validierung,
4. Dateninitialisierung ohne DDL,
5. Freigabe der Fachservices.

## Führende Fachaggregate

Die verbindlichen Identitäten, Erweiterungstabellen, Löschregeln und Berichtsdatenquellen sind unter `docs/architecture/domain-aggregates.md` festgelegt. `DomainAggregateIntegrityService` prüft die registrierten 1:1-Erweiterungen beim Start auf verwaiste Datensätze und falsche Root-Typen. Fachservices für Erweiterungen verwenden in der produktiven Composition Root denselben zentralen Root-Service, Fristendienst und Auditdienst.

## Einheitliche Fehlergrenze zwischen Main Process und Renderer

Alle `ipcMain.handle`-Registrierungen laufen über `registerIpcHandler`. Erfolgswerte und bewusst modellierte fachliche Resultate bleiben unverändert. Unbehandelte Fehler werden dagegen in ein datensparsames `ApplicationErrorPayload` mit stabilem Code, nutzergeeigneter Meldung und IPC-Operation übersetzt. Stacktraces, Ursachenobjekte, SQL und Dateiinhalte werden nicht über die Bridge transportiert.

Der sandboxed Preload enthält seine schlanke `invokeIpc`-Grenze direkt und lädt außer `electron` keine lokalen Laufzeitmodule nach. Er rekonstruiert aus dem serialisierten Payload einen `RendererApplicationError`; unbekannte Electron- oder Transportfehler werden unverändert weitergeworfen. Damit bleibt bestehendes Promise-/Catch-Verhalten erhalten, während alle Anwendungsfehler einheitlich auswertbar sind.

## Renderer-Sicherheits- und Lint-Baseline

Der Renderer wird zusätzlich zu `contextIsolation: true` und `sandbox: true` durch eine
Content-Security-Policy in `index.html` begrenzt. Externe HTTP-/HTTPS-Ziele werden nicht
für den Renderer freigegeben; die optionale Gremia.BR-Lesebrücke arbeitet ausschließlich
im Main-Prozess. Lokale WebSocket-Ziele sind nur für den Vite-Entwicklungsserver erlaubt.

ESLint verwendet die Flat-Config `eslint.config.js`. Der produktive Plattform-Build führt
nach dem strikten Source-Cleanup und vor TypeScript/Vite immer `npm run lint` aus. Explizites
TypeScript-`any` ist vollständig bereinigt und wird doppelt als Nullbestand abgesichert:
`@typescript-eslint/no-explicit-any` steht auf `error`, zusätzlich prüft ein vollständiger
TypeScript-AST-Audit die leere versionierte Baseline.

## Verbindliche Auditierung beim Fall-Hard-Delete

Der endgültige Löschpfad einer Fallakte ist eine atomare fachliche Operation. Innerhalb eines
SQLite-Savepoints werden zunächst die Lifecycle-Ereignisse der kaskadierend entfernten Maßnahmen
und anschließend genau ein datensparsames Fallevent in `personal_data_audit_log` geschrieben.
Erst danach wird die `cases`-Zeile gelöscht. Schlägt das obligatorische Fallevent fehl, rollt der
Savepoint sämtliche Datenbanklöschungen zurück.

Das Fallevent enthält ausschließlich technische Zählwerte und feste Enums (`deleted`,
`hard_delete`). Fallnummer, Anzeigename, Löschbegründung, Notiz- oder Dokumentinhalte werden nicht
in der Hash-Chain gespeichert. Der Suchindex bleibt eine rekonstruierbare Projektion und wird erst
nach erfolgreichem Abschluss der fachlichen Transaktion bereinigt.

## Reproduzierbare Testqualitätsmetriken

Die Testbasis wird nicht mehr über eine einzelne, interpretationsbedürftige „Verhaltenstestquote“ beschrieben. `scripts/report-test-quality.cjs` weist Verhalten, hybride Tests und reine Source-Inspection getrennt aus und zählt Source-Text-Assertions zusätzlich unabhängig von der Dateikategorie. Definition, Grenzen und Ratchet-Regeln stehen in `docs/quality/test-quality-metrics.md`. Der Release-Check verhindert, dass die Zahl reiner Source-Inspection- oder hybrider Testdateien über die versionierte Baseline steigt.

## Type-Safety-Null-Ratchet für explizites `any`

Explizites TypeScript-`any` wird projektweit AST-basiert inventarisiert. Die Baseline unter `maintenance/type-safety/explicit-any-baseline.json` ist leer. `npm run type-safety:any-check` blockiert jede neue Fundstelle; ESLint erzwingt dieselbe Grenze zusätzlich syntaktisch.

Der Check ersetzt keine fachliche Typisierung: Datenbankzugriffe erhalten konkrete Row-Typen, externe Eingaben `unknown` plus Laufzeitvalidierung. Die leere Baseline darf nicht als allgemeine Ausnahme wieder aufgefüllt werden.

### Robuste npm-Skriptverträge

Release- und Build-Readiness-Prüfungen vergleichen verkettete npm-Skripte nicht als komplette Zeichenfolge. Pflichtschritte werden über `scripts/lib/npm-script-contract.cjs` als geordnete Sequenz validiert. Dadurch bleiben zusätzliche Quality Gates zulässig, während fehlende, vertauschte oder verbotene Schritte weiterhin den Build abbrechen.
