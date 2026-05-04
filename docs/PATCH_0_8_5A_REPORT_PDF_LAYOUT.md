# Patch 0.8.5-a – PDF-Report-Layout entnestet

## Ziel

Compliance-PDFs und aus Markdown erzeugte Report-Inhalte dürfen nicht mehr wie mehrfach ineinandergelegte Karten gerendert werden. Der bisherige Markdown-Renderer öffnete für Überschriften und Tabellen teilweise neue `section.box`-Container, ohne vorherige Abschnittscontainer sauber zu schließen. Dadurch entstand im PDF eine stark verschachtelte Rahmenstruktur.

## Änderungen

- `markdownToReportHtml()` führt jetzt einen expliziten Abschnittszustand (`inSection`).
- Neue Überschriften schließen den vorherigen Abschnitt sauber.
- Tabellen werden als eigenständige, flache `report-table-section` gerendert.
- Listen und Absätze werden in genau einem aktuellen Abschnitt gesammelt.
- Die PDF-CSS-Struktur nutzt nun `report-section` als flache Drucksektion.
- Abschnittsblöcke sind für den Druck mit `break-inside: avoid` markiert.

## Wirkung

PDF-Reports, insbesondere TOMs, VVT, DSFA und sonstige Compliance-Dokumente, erhalten wieder eine klare, flache A4-Struktur ohne Matroschka-Rahmen.
