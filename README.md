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
