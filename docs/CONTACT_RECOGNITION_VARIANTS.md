# Kontakterkennung – Kurzformen

Version: 0.3.31

## Ziel

Gesprächsnotizen und Protokolle sollen nicht nur vollständige Kontaktnamen erkennen, sondern auch typische Kurzformen, damit ein späteres Löschen eines Kontakts die vorhandenen Textstellen zuverlässig anonymisieren kann.

## Neu erkannte Schreibweisen

Zusätzlich zu den bestehenden Varianten werden erkannt:

```text
M. Mustermann
Herr Mustermann
Frau Mustermann
```

Die Initial-Variante wird aus dem ersten Buchstaben des Vornamens und dem Nachnamen des Kontakts gebildet.

## Ambiguitätsschutz

Kurzformen können mehrdeutig sein. Deshalb gilt:

- `M. Mustermann` wird nur automatisch verknüpft, wenn es genau einen Kontakt mit dieser Initiale und diesem Nachnamen gibt.
- `Herr Mustermann` und `Frau Mustermann` werden nur automatisch verknüpft, wenn es genau einen Kontakt mit diesem Nachnamen gibt.

Wenn mehrere Kontakte denselben Nachnamen haben, soll im Protokoll besser die vollständige Form oder der `@@`-Kontaktverweis verwendet werden.

## Datenschutzlogik

Die erkannten Schreibweisen werden in `contact_text_references` dokumentiert. Wird ein Kontakt gelöscht, werden die bekannten Textstellen durch

```text
[Kontakt anonymisiert]
```

ersetzt und der Volltextindex wird aktualisiert.
