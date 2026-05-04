# Patch 0.8.5-g – Kompakte Vorlagenverwaltung und bessere Flächennutzung

Patch 0.8.5-g optimiert das Layout nach den ersten Praxisscreenshots der responsiven Oberfläche. Der Schwerpunkt liegt auf drei Punkten: weniger Leerraum zwischen Sidebar und Inhalt, ein besser nutzbarer Vorlagenkatalog und ein kompakterer Detailbereich.

## Layout-Baseline

- Der Inhaltsbereich nutzt auf Desktop-Breiten jetzt die verfügbare Breite vollständig.
- Der historisch aus `globals.css` stammende `margin-left` wird in der zentralen `responsiveDesign.css` eindeutig neutralisiert.
- `--layout-content-max` ist auf `none` gesetzt; Breitenbegrenzungen erfolgen künftig gezielt in den jeweiligen Modulen statt global.
- Abstände und Panel-Paddings wurden reduziert, ohne Touch-/Tastaturbedienbarkeit zu verschlechtern.

## Vorlagenkatalog

Die Vorlagenliste wurde funktional und visuell verdichtet:

- thematische Gruppierung nach Vorlagenkategorie,
- alphabetische Sortierung innerhalb der Gruppen,
- alternative Sortierung „Alphabetisch“,
- clientseitige Pagination mit 12 / 24 / 48 Vorlagen pro Seite,
- kompaktere Listeneinträge,
- klare Gruppenüberschriften.

## Detailbereich

Der Detailbereich ist jetzt kompakter:

- Bearbeiten-Aktion wandert in den Detailkopf,
- Metadaten werden reduziert und dichter dargestellt,
- Textvorschau nutzt weniger feste Mindesthöhe,
- Detailbereich bleibt auf Desktop-Breiten sticky sichtbar.

## Version und Tests

- Version: `0.8.5-g`
- Neuer Test: `tests/templateLayout085g.test.ts`
- Neues Script: `npm run test:template-layout-085g`

Zusätzlich wurden ältere Postinstall-/Patchtests so angepasst, dass sie nicht mehr an historischen Einzelversionen brechen, sondern die aktuelle 0.8-Linie akzeptieren bzw. die zentrale Version prüfen.
