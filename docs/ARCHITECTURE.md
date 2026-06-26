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
