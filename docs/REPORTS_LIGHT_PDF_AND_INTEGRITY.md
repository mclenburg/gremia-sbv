# Berichte: helles PDF-Layout und Systemintegrität

Ab Version 0.3.36 werden PDF-Berichte bewusst im hellen Papierlayout erzeugt. Die Anwendung selbst kann weiter im Dark- oder Light-Industrial-Theme laufen; der PDF-Export nutzt unabhängig davon ein drucktaugliches helles Industrial-Design.

## Berichtsauswahl

Die Berichtsseite verwendet klickbare Kacheln statt einzelner PDF-Buttons. Eine Kachel erzeugt den jeweiligen PDF-Bericht direkt. Die Bedienung funktioniert auch per Tastatur mit Enter oder Leertaste.

## System- und Integritätsbericht

Der Systembericht prüft jetzt zusätzlich die Datenbankkonsistenz:

- `PRAGMA integrity_check`
- `PRAGMA quick_check`
- `PRAGMA foreign_key_check`
- erforderliche Tabellen
- verwaiste Fall-/Fristen-/Dokumentenbezüge
- Schema-Version und letzte Migrationen
- Datenbankgröße und Speicherorte

Auffälligkeiten werden im Bericht als Warnungen ausgegeben.
