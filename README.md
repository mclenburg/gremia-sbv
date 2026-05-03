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
