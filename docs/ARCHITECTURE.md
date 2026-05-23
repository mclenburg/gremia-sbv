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

## Dashboard-Prinzip

Das Dashboard ist keine Werbefläche für Module. Es zeigt nur Bereiche mit unmittelbarem Arbeitswert:

- Fälle,
- Fristen,
- Compliance-Center,
- Gremia.BR-Lesebrücke.

Alles andere gehört in die Fachmodule.
