# Gremia.SBV 0.5.2 – BEM-Übersicht und Fallaktenansicht

## Ziel

Die BEM-Seite soll wie ein kompakter Leitstand wirken und die Fallaktenansicht soll optisch zur Präventionsmaßnahme passen.

## Änderungen

### BEM-Übersicht

- kompakter Kopfbereich innerhalb des Panels
- Hilfe als kleines sekundäres Element rechts oben
- Kennzahlenleiste: offen, Reaktion offen, überfällig, gesamt
- aktive Statusgruppen zuerst
- leere Statusgruppen werden nicht mehr alle angezeigt
- nur die nächste leere aktive Gruppe bleibt als Orientierung sichtbar
- abgeschlossene, abgelehnte oder abgebrochene Verfahren stehen unten und sind eingeklappt
- Karten nutzen die gleiche `process-overview-card`-Struktur wie die Präventionsübersicht
- Klick öffnet weiterhin direkt die Fallakte auf genau dem BEM-Verfahren

### BEM in der Fallakte

- Header an Präventionsverfahren angeglichen
- `case-detail-inline-form`
- `case-process-header`
- Dokumentbutton als `case-process-document-link`
- Statusübersicht rechts mit Status, Reaktion und Frist
- Formularsektionen laufen im gleichen Prozesslayout wie Prävention

## Bewusst nicht enthalten

Die generische Inline-Command-Logik für BEM-Textfelder bleibt ein eigener späterer Schnitt. 0.5.2 behebt zuerst die sichtbare Oberflächeninkonsistenz.
