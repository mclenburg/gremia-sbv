# Patch 0.8.6-d – Inline-Overlay-Stabilisierung

Dieser Patch stabilisiert das Kurzbefehls- und Overlay-Konzept für die Live-Erfassung in der Fallakte.

## Ziele

- Kurzbefehle werden robuster erkannt und nicht mehr mitten in Wörtern ausgelöst.
- Text hinter einem Kurzbefehlsmarker wird zentral als Befehlsargument interpretiert.
- Globale Textbefehle ersetzen auf Wunsch den gesamten Befehlsteil, nicht nur das Kürzel.
- Das globale Overlay ist per Tastatur besser bedienbar: `Esc` bricht ab, `Strg+Enter` speichert.
- Die Kurzbefehls-Hilfe per `Strg+H` ist durchsuchbar und führt den Fokus im Dialog.

## Keine Schemaänderung

Die Datenbank-Schema-Version bleibt bei `0023`. Der Patch ändert UI- und Command-Verhalten, aber keine Tabellenstruktur.

## Produktregel

Die Fallakte bleibt der Ort der personenbezogenen Arbeit. Kurzbefehle beschleunigen den Arbeitsfluss, ohne diese Aktenbindung aufzuweichen.
