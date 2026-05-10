# Changelog Gremia.SBV

Stand: **0.9.1**

Dieses Changelog enthält nur noch zusammengefasste, dauerhafte Entwicklungslinien. Historische Einzelpatch-Dateien und RC-Zwischenstände werden aus dem aktiven Dokumentationsbestand entfernt.

## 0.9.1 – Personenverzeichnis, Import und Datenschutz-Lifecycle

- Personenverzeichnis für schwerbehinderte und gleichgestellte Beschäftigte ergänzt.
- Kein GdB-Standardfeld; Schutzstatus ist fachlich führend.
- Personalnummer optional; Import über Personalnummer oder dienstliche E-Mail, Vollnamen-Spalte inklusive `Nachname, Vorname` möglich.
- Import-Assistent mit Quelle, Vorschau, Spaltenmapping, Prüfung und Ergebnis.
- Fallaktenbindung vorbereitet: reguläre Fallakten sollen genau einer Person oder einer pseudonymen anonymen Anfrage zugeordnet werden.
- Statusablaufwarnungen und Datenschutzprüfungen werden als Fristen in das bestehende Fristensystem integriert.
- iCal-Export nutzt datensparsame Prozesstyp-Titel statt generischer Platzhalter oder sensibler Detaildaten.
- Compliance-Dokumente, DSFA, TOMs und VVT werden auf Personenverzeichnis, Audit-ohne-Direktidentifikatoren, Art. 13/14, Art. 15 und § 164 Abs. 4 SGB IX erweitert.

## 0.9.0-rc.1 – RC-Stabilisierung

- Fallakten-Workbench, Maßnahmenmasken, Responsive Layout, Light-/Dark-Mode-Basis und Release-Artefakte stabilisiert.
- Große Maßnahmen-Textfelder speichern auf Lost Focus statt bei jedem Tastendruck.
- Inline-Kurzbefehle bleiben in großen Textfeldern aktiv.
- Windows-Build auf portable EXE ausgerichtet; Release-Upload soll nur `.exe`, `.AppImage` und `.dmg` enthalten.

## 0.8.x – Fundament und Härtung

- Prozessfundament, Fristen, BEM, Prävention, Beteiligung, Kündigung, Gleichstellung / GdB-Beratung und Arbeitsplatzgestaltung aufgebaut.
- `workflowViews.tsx` entkernt; Fallaktenansicht in Feature-Module aufgeteilt.
- Lebende Protokollverknüpfungen eingeführt: `/bem`, `/praev`, `/bet`, `/kuend`, `/gleich`, `/anp` und `/fr`.
- Sicherheits-, Backup-, Audit-, ExportGuard-, Compliance- und E2E-Grundlagen geschaffen.
