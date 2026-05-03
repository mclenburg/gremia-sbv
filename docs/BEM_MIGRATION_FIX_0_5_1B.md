# Gremia.SBV 0.5.1b – robuste BEM-Migration

## Problem

0.5.1a reparierte zwar die fehlende `status`-Spalte, las aber beim Import aus der Legacy-Tabelle weiterhin Spalten wie `title` und `current_phase`.

Bei frühen/kaputten 0.5.0-Testständen konnte die vorhandene `bem_processes`-Tabelle aber ein unbekanntes oder sehr kleines Schema haben. Dadurch schlug die Migration mit Fehlern wie diesen fehl:

```text
no such column: title
```

## Änderung

Die Migration 0015 ist jetzt konservativ:

1. vorhandene `bem_processes` wird nach `bem_processes_legacy_0500` gesichert,
2. es wird keine SELECT-Übernahme aus unbekanntem Legacy-Schema mehr versucht,
3. die neue BEM-Tabelle wird sauber mit vollständigem 0.5.x-Schema angelegt,
4. Indexe werden erst nach der neuen Tabelle erzeugt.

## Konsequenz

Falls in einem frühen 0.5.0-Teststand bereits BEM-Testdaten in einer kaputten Tabelle lagen, werden diese nicht automatisch übernommen. Die Tabelle bleibt als `bem_processes_legacy_0500` erhalten, damit sie bei Bedarf manuell inspiziert werden kann.

Für produktive Daten ist das vertretbar, weil BEM erst mit 0.5.x eingeführt wurde und frühere Tabellenzustände nicht als stabile Datenbasis gelten.
