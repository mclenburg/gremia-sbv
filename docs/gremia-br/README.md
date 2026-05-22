# Gremia.BR-Lesebrücke

Gremia.SBV kann optional mit einem Gremia.BR-Server verbunden werden. Diese Funktion ist als **read-only Kooperationsbrücke** gedacht.

## Zweck

Die SBV kann gezielt BR-Informationen abrufen, die für ihre Arbeit relevant sind:

- nächste und kommende BR-Sitzungen,
- Tagesordnungspunkte mit SBV-Bezug,
- fällige oder überfällige BR-Beschlüsse,
- Suchvorschläge für externe BR-Referenzen.

## Nicht-Zweck

Die Lesebrücke ist keine Synchronisation und kein gemeinsamer Datenraum.

Ausgeschlossen sind:

- Rückschreiben nach Gremia.BR,
- Übertragung von SBV-Falldaten,
- Hintergrundabfragen,
- BR-Mitgliederverwaltung,
- Stimmrechtslogik,
- Admin- und DSGVO-Endpunkte von Gremia.BR,
- Datei-Upload zu Gremia.BR.

## Sicherheit

- Verbindung ist standardmäßig deaktiviert.
- Server-URL und Zugangsdaten werden im SQLCipher-Vault gespeichert.
- Das JWT wird bevorzugt nur im Arbeitsspeicher gehalten.
- Der Adapter nutzt eine harte Whitelist.
- Suchbegriffe und Antwortinhalte werden nicht auditiert.

## Nutzung

Die Verbindung wird unter **Einstellungen → Gremia.BR** eingerichtet. Das Dashboard zeigt nur gecachte Daten und aktualisiert diese ausschließlich durch eine bewusste Nutzeraktion.
