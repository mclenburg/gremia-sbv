# Kontextbezogene Vorlagen

Ab Version 0.4.8 ist das Vorlagenmodul nicht mehr als primärer Arbeitsort gedacht. Es bleibt die Bibliothek für Systemvorlagen und eigene Textbausteine. Die eigentliche Texterzeugung erfolgt dort, wo der Text fachlich hingehört: in der Fallakte oder im aktuellen Fachprozess.

## Grundsatz

Nicht die SBV sucht eine Vorlage und befüllt mühsam Platzhalter. Die App schlägt am passenden Vorgang einen kleinen Link vor, etwa „Schreiben erzeugen“. Die benötigten Werte werden aus Fallakte, Präventionsverfahren, Fristen, Kontakten und Rechtsbezügen übernommen.

## Erste kontextbezogene Aktionen

- Fallakte → allgemeines SBV-Beteiligungs-/Unterlagen-Schreiben
- Präventionsverfahren → Arbeitgeber anschreiben
- Präventionsverfahren → Arbeitgeberreaktion nachhalten
- Präventionsverfahren → Unterlagen / Beteiligung nachfordern

## Sicherheit

Entwürfe werden fallbezogen archiviert. Beim Kopieren in die Zwischenablage zeigt die App einen Hinweis, weil die Zwischenablage außerhalb des geschützten Tresors liegt.

## Tests

Die Kontextzuordnung und Platzhalterhinweise werden über `tests/templateContextPolicy.test.ts` geprüft.
