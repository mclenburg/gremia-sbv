# Gremia.BR-Lesebrücke

Gremia.SBV kann optional mit einem Gremia.BR-Server verbunden werden. Diese Funktion ist eine **kontrollierte, manuell ausgelöste read-only Kooperationsbrücke**. Sie ergänzt die SBV-Arbeit um BR-Kontext, ohne die getrennten Datenräume von Betriebsrat und Schwerbehindertenvertretung aufzulösen.

## Zweck

Die SBV kann gezielt BR-Informationen abrufen, die für ihre Arbeit relevant sind:

- nächste, laufende und kommende BR-Sitzungen,
- Tagesordnungspunkte mit möglichem SBV-Bezug,
- Protokollstatus und Protokollreferenzen,
- fällige oder überfällige BR-Beschlüsse,
- Beschlussstatistiken als Kontext,
- Dokument-Metadaten und Kategorien als Referenz,
- Suchvorschläge für externe BR-Referenzen.

## Nicht-Zweck

Die Lesebrücke ist keine Synchronisation und kein gemeinsamer Datenraum.

Ausgeschlossen sind:

- Rückschreiben nach Gremia.BR,
- Übertragung von SBV-Falldaten,
- Hintergrundabfragen,
- BR-Mitgliederverwaltung,
- BR-Notizen,
- Abwesenheiten,
- Audit-Logs,
- Stimmrechtsänderungen,
- Admin- und DSGVO-Endpunkte von Gremia.BR,
- Datei-Upload zu Gremia.BR.

## Sicherheit

- Verbindung ist standardmäßig deaktiviert.
- Server-URL und Zugangsdaten werden im SQLCipher-Vault gespeichert.
- JWT-Token werden ausschließlich im Arbeitsspeicher gehalten und nicht persistiert.
- Der Adapter nutzt eine harte Whitelist.
- Suchbegriffe und Antwortinhalte werden nicht auditiert.
- Dokumente werden nicht automatisch in Gremia.SBV importiert; vorgesehen sind Referenzen und bewusst ausgelöste Vorschauen.

## Neue Gremia.BR-API

Die aktuelle Gremia.BR-OpenAPI stellt zusätzliche lesende Endpunkte bereit. Gremia.SBV nutzt davon nur den fachlich passenden Ausschnitt:

- Auth: Login, Refresh, Logout, Session-/Profilprüfung,
- Sitzungen: nächste, laufende, kommende Sitzung, Tagesordnung und Protokollstatus,
- Protokolle/Beschlüsse: Listen, Sitzungsbezug, Fälligkeiten und Statistik,
- Dokumente: Liste, Kategorien, Metadaten und HTML-Vorschau,
- Suche: Suche, Vorschläge, erweiterte Suche und Suchstatistik.

Nicht freigegeben bleiben insbesondere Admin, Audit, DSGVO, Notizen, Abwesenheiten, Mitgliederverwaltung, Ausschüsse, Uploads und alle fachlichen Schreiboperationen.

## Nutzung

Die Verbindung wird unter **Einstellungen → Gremia.BR** eingerichtet. Das Dashboard zeigt nur gecachte Daten und aktualisiert diese ausschließlich durch eine bewusste Nutzeraktion.
