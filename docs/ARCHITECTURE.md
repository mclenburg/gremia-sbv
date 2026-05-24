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

Die Gremia.BR-Anbindung ist optional, standardmäßig deaktiviert und read-only. Sie nutzt eine harte Endpunkt-Whitelist, speichert Zugangsdaten im Vault und führt Netzwerkzugriffe nur auf explizite Nutzeraktion aus.


## UI-Zentralisierung und Architektur-Gates

Seit der 0.9.2-Zentralisierung gilt für neue UI-Arbeit: Fachmodule bauen keine Standard-Shells, Panels, Buttons, Formulare, Badges, Dialoge, Empty-States, Suchleisten oder Tabellen mehr lokal nach. Vor einer neuen UI-Struktur ist zuerst die zentrale Schicht unter `src/app/shared/components`, `src/app/shared/dialogs` und `src/app/ui/responsiveDesign.css` zu prüfen.

Verbindliche Bausteine:

- `WorkbenchPage`, `WorkbenchWorkspace`, `WorkbenchHeader`, `WorkbenchToolbar`, `WorkbenchSidebar`, `WorkbenchContent`
- `IndustrialPanel`, `IndustrialRecordCard`, `IndustrialSelectionCard`, `IndustrialStatusCard`, `IndustrialWarningPanel`, `IndustrialDangerPanel`
- `IndustrialButton`, `ToolbarButton`, `DangerButton`, `GhostButton`, `IconButton`, `ButtonGroup`
- `FormSection`, `FormField`, `TextInput`, `TextareaInput`, `SelectInput`, `DateInput`, `DateTimeInput`, `PasswordInput`, `CheckboxField`, `FormActions`
- `StatusBadge`, `RiskBadge`, `DeadlineBadge`, `ComplianceBadge`, `ProcessStatusBadge`
- `IndustrialModal`, `ConfirmDialog`, `DestructiveConfirmDialog`, `ReasonRequiredDialog`, `PassphraseDialog`, `ExportResultDialog`
- `SearchToolbar`, `FilterBar`, `RecordList`, `DataTable`, `EmptyState`

Für neue Features bedeutet das: Erst zentrale Komponente nutzen, dann fachliche Abweichung klein begründen und testen. Neue modulnahe CSS-Dateien, direkte Feature-CSS-Imports und lokale Nachbauten zentraler Industrial-/Workbench-Klassen sind nicht zulässig. Native Formularfelder oder Buttons in Feature-Views sind nur noch erlaubt, wenn ein bestehendes zentrales Pattern technisch nicht passt und der Architekturtest dafür bewusst erweitert wird.

## Dashboard-Prinzip

Das Dashboard ist keine Werbefläche für Module. Es zeigt nur Bereiche mit unmittelbarem Arbeitswert:

- Fälle,
- Fristen,
- Compliance-Center,
- Gremia.BR-Lesebrücke.

Alles andere gehört in die Fachmodule.
