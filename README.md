# Gremia.SBV

Gremia.SBV ist eine lokale, offline-first Desktop-Anwendung für die vertrauliche Fallarbeit der Schwerbehindertenvertretung.

Stand: 0.4.58a

## Datenschutz / DSGVO

Die SBV-spezifische Datenschutzdokumentation liegt unter `docs/DSGVO_SBV.md`, ergänzt durch `docs/DSFA_SBV_TEMPLATE.md`, `docs/LOESCHKONZEPT_SBV.md` und `docs/VERARBEITUNGSVERZEICHNIS_SBV.md`.

## Leitlinien

- Fallakte als zentrales Arbeitsinstrument
- lokale verschlüsselte Datenhaltung
- ExportGuard vor sensiblen Exporten
- keine automatische Cloud-Synchronisation
- keine Erwähnung nicht implementierter externer Produktschnittstellen


## Stand 0.5.0

Das BEM-Grundmodul ist als eigenes Fachmodul ergänzt: Übersicht, Fallaktenintegration, Detailformular, Service, IPC und Migration.


## Stand 0.5.1

Barrierefreiheit und Typensicherheit verbessert: Statusmeldungen aus Fallakte, Vorlagen und Berichten werden per LiveRegion angekündigt; `InlineCommandOverlays` ist nicht mehr mit `any` typisiert.


## Stand 0.5.2

BEM-Übersicht als kompakter Leitstand überarbeitet und BEM-Fallaktenansicht optisch an die Präventionsmaßnahme angeglichen.


## Stand 0.5.3

Globale Inline-Befehle für Textfelder ergänzt: `//`, `@@`, `##`, `§§`, `!!`, `>>`, `^^` und `~~` funktionieren jetzt in allen `TextCommandTextarea`-Feldern. Die Fallnotiz behält ihre tiefer integrierte lokale Logik.


## Stand 0.5.4

Migration Hardening ergänzt: Schema-Version 0015, BEM-Migration abgesichert, Schema-Validierung nach Migration und verständlichere Diagnose bei Tresor-/Datenbank-/Manifestproblemen.


## Stand 0.5.5

Modulgrenzen verbessert: `waitForBridge`, `formatDateShort` und `CaseNodeTarget` wurden aus `workflowViews.tsx` ausgelagert. LiveRegion-Ankündigungen wurden in BEM, Fallnotiz-Modal und Wissensdatenbank ergänzt.


## Stand 0.5.6

Generic Process Framework ergänzt und BEM fachlich vertieft: Datenschutz-/Einwilligungsdokumentation, Maßnahmenverantwortliche, Wirksamkeitsprüfung und Abschlussgrund sind nun strukturierte Felder. Prävention und BEM nutzen die gemeinsame Maßnahmenübersicht.


## Stand 0.5.7

BEM fachlich abgerundet: Statusführung mit Pflichtfeldhinweisen, Statusvorschlägen und BEM-Systemvorlagen für Angebot, Datenschutz, Einwilligung, Gesprächsprotokoll, Maßnahmenplan, Wirksamkeitsprüfung und Abschluss.


## Stand 0.5.8

Datenschutz-/Export-Härtung: BEM-Dokumente erhalten eine eigene kritische Exportprüfung, BEM-/Präventionsberichte nutzen das aktuelle Schema und Backups melden Datenschutz-/Schema-Hinweise deutlicher.


## Stand 0.5.9a

Auth-Boundary-Schnitt syntaktisch korrigiert: `LoginGate` ist ausgelagert, `DashboardOverview` bleibt intakt. `postinstall` für native Electron-Abhängigkeiten bleibt gesetzt.


## Stand 0.5.10

Fristenmodul weiter entkoppelt: `DeadlinesView` und `DeadlineEditor` liegen jetzt in `src/app/features/deadlines/DeadlinesView.tsx`. `workflowViews.tsx` ist weiter entlastet.


## Stand 0.6.0

Gleichstellung / GdB als aktives Fachmodul ergänzt: Übersicht, Fallaktenmaßnahme, Detailformular, IPC-Service, Warnlogik und Vorlagen für Antrag, Unterlagennachforderung und Widerspruchsfrist.


## Stand 0.6.1

Gleichstellung/GdB stabilisiert: doppelte Überschriften und Entwicklungs-Hinweis entfernt, Statusführung und Vorlagenintegration in der Fallakte ergänzt. Die Fallliste ist wieder auf 5 Einträge pro Seite paginiert; das Neue-Fall-Modal ist horizontal scrollbar.


## Stand 0.6.1a

Layout-Fix: Das Neue-Fall-Modal nutzt keinen horizontalen Scroll mehr, sondern bricht Formularfelder responsiv um.


## Stand 0.6.1b

Build-Fix: Pagination-State der Falltabelle ergänzt und Gleichstellungsprozesse für das Prozessvorlagen-Modal typseitig freigeschaltet.


## Stand 0.6.1c

Build-Fix: Prozessvorlagenmodal und ExportGuard verwenden für Gleichstellungsprozesse `applicationStatus` statt `status`.


## Stand 0.6.1d

Build-Fix: Prozessvorlagenmodal nutzt Type-Guards für Gleichstellungsprozesse (`applicationStatus`) und Prävention/BEM (`status`).


## Stand 0.6.2

PlaceholderView-Guard auf Set-basierte Prüfung umgestellt, sodass implementierte Module wie Gleichstellung/GdB nicht mehr parallel zum Placeholder gerendert werden. PreventionView nutzt jetzt ebenfalls `useAnnouncer`. Der Datenschutz-Schuldposten für Gleichstellungsnotizen ist dokumentiert.


## Stand 0.6.2a

Build-Fix: `usb` aus `IMPLEMENTED_VIEW_IDS` entfernt, weil es kein gültiger `ViewId` ist.


## Stand 0.6.3

Gleichstellungs-/GdB-Notizen werden für neue Inhalte nicht mehr im Gleichstellungsdatensatz gespeichert, sondern als hoch sensible Fallnotizen geführt und im Detailformular gefiltert angezeigt.


## Stand 0.7.0

Kündigungsanhörung als aktives Fachmodul ergänzt: Übersicht, Fallaktenmaßnahme, Detailformular, IPC-Service, Warnlogik, Vorlagen und Migration. `postinstall` bleibt für native Electron-Abhängigkeiten gesetzt.


## Stand 0.7.1

Kündigungsanhörung stabilisiert: Prozessvorlagenfilter, Vorlagenmodal und ExportGuard erkennen `termination_hearing` vollständig. `postinstall` bleibt gesetzt.


## Stand 0.7.1a

Build-Fix: Die Modulnavigation verwendet jetzt `termination_hearing` als gültigen `ViewId`, passend zu `App.tsx` und dem Prozessmodul. `postinstall` bleibt gesetzt.


## Stand 0.7.2

Kündigungsanhörung fachlich gehärtet: Fristvorschläge, geschärfte Warnlogik, Schutzstatusprüfung, Integrationsamt-Hinweise und zusätzliche Kündigungs-Checkliste. `postinstall` bleibt gesetzt.


## Stand 0.7.3

Kündigungsanhörung datenschutz- und exportsicherer: sensible Felder klassifiziert, Kündigungsexporte mit erweitertem ExportGuard-Kontext, UI-Hinweis im Detailformular. `postinstall` bleibt gesetzt.


## Stand 0.8.0

Compliance Center ergänzt: TOMs, DSFA-Entwurf, DSGVO-/BDSG-Compliance-Auswertung und Freigabeformular für DSB/IT-Security können direkt in der App erzeugt und als Markdown exportiert werden. `postinstall` bleibt gesetzt.


## Stand 0.8.0a

Build-Fix: `ComplianceView` übergibt keine nicht unterstützte `icon`-Prop mehr an `ModuleFrame`. `postinstall` bleibt gesetzt.


## Stand 0.8.0b

Migrationsfix: `0017_termination_hearings.sql` repariert unvollständige Teilläufe der Kündigungsanhörungs-Tabelle, die zu `no such column: status` führen konnten. `postinstall` bleibt gesetzt.


## Stand 0.8.1

Compliance Center erweitert: Antwortgenerator für DSGVO-Auskunftsersuchen nach Art. 15 DSGVO mit Prüfliste, Datenkategorien, Empfänger-/Speicherfristen-Abschnitten und Markdown-Export. `postinstall` bleibt gesetzt.


## Stand 0.8.2

Compliance Center Layout verbessert: Dokumentkarten, Auskunftsformular und Vorschau sind jetzt breit und responsiv angeordnet. Zusätzlich gibt es einen PDF-Export über eine druckoptimierte PDF-Ansicht. `postinstall` bleibt gesetzt.


## Stand 0.8.3

Berichte-Modul ergänzt: anonymisierter SBV-Tätigkeitsbericht mit aggregierten Fall-, Frist- und Prozesszahlen, Markdown-Export und PDF-Druckansicht. Sensible Freitexte werden bewusst nicht übernommen. `postinstall` bleibt gesetzt.


## Stand 0.8.3a

Compliance Center nutzt für PDF-Exporte denselben direkten Berichts-PDF-Pfad wie das Berichte-Modul. Die vorherige Markdown/HTML-Druckansicht in ComplianceView wurde entfernt. `postinstall` bleibt gesetzt.
