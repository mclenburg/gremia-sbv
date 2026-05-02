# Kontaktverknüpfungen und Anonymisierung

Ab Version 0.3.30 werden Kontakte nicht nur als Klartext in Protokolle eingefügt, sondern datenschutzrechtlich nachvollziehbar verknüpft.

## Erkennung beim Speichern

Beim Speichern einer Gesprächsnotiz oder eines Protokolls scannt Gremia.SBV die Textfelder auf vorhandene Kontakte. Erkannt werden Kombinationen aus Vorname und Nachname, insbesondere:

- `Nachname, Vorname`
- `Vorname Nachname`
- `Nachname Vorname`
- optional mit Organisation, z. B. `Nachname, Vorname (Firma)`

Gefundene Treffer werden in `contact_text_references` gespeichert. Der Text wird dabei nicht verändert.

## Löschen eines Kontakts

Wird ein Kontakt im Kontaktregister gelöscht, anonymisiert die App alle bekannten Textstellen in Gesprächsnotizen und Protokollen, die mit diesem Kontakt verknüpft sind. Der Klartext wird ersetzt durch:

```text
[Kontakt anonymisiert]
```

Danach wird der Kontakt gelöscht und der Volltextindex der betroffenen Protokolle aktualisiert.

## Grenzen

Die Erkennung ist bewusst konservativ. Sie arbeitet mit der Kombination aus Vorname und Nachname. Einzelne Vornamen oder einzelne Nachnamen werden nicht automatisch verknüpft, weil dies zu viele falsche Treffer erzeugen würde.

Dokumentinhalte werden aktuell nicht automatisch umgeschrieben. Importierte Dokumente bleiben als Originaldokumente erhalten. Für Dokumente ist später ein eigenes Schwärzungs-/Versionierungsmodul sinnvoll.
