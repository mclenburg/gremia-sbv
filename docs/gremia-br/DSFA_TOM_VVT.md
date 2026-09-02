# Datenschutzbewertung zur Gremia.BR-Kooperationsbrücke

Dieses Dokument beschreibt die datenschutzrechtliche Einordnung der optionalen Gremia.BR-Kooperationsbrücke in Gremia.SBV.

## Verarbeitungstätigkeit

**Bezeichnung:** Kontrollierte Kooperation zwischen Gremia.SBV und dem SBV-Arbeitsbereich in Gremia.BR  
**Zweck:** Unterstützung der Zusammenarbeit zwischen Betriebsrat und Schwerbehindertenvertretung  
**System:** Gremia.SBV, lokaler SQLCipher-Vault  
**Quelle:** Gremia.BR-Server des Betriebsrats  
**Richtung:** Gremia.BR → Gremia.SBV für Lesekontext; Gremia.SBV → Gremia.BR nur für ausdrücklich ausgelöste SBV-Arbeitsbereichsaktionen

## Verarbeitete Daten

Möglich sind:

- Sitzungstitel und Sitzungstermine,
- Tagesordnungspunkte,
- Beschlussmetadaten,
- Beschlusstitel und ggf. Beschlusstexte, soweit aus Gremia.BR bereitgestellt,
- technische Verbindungsdaten,
- lokale Referenzen auf BR-Elemente,
- zentral erzeugte Gremia.SBV-PDF-Dokumente, wenn die SBV deren Übergabe ausdrücklich auslöst.

Nicht verarbeitet werden dürfen:

- vollständige SBV-Falldaten oder interne SBV-Notizen auf dem Gremia.BR-Server,
- Gesundheitsdaten aus Gremia.SBV,
- Passwörter oder Tokens in Logs,
- Suchbegriffe im Audit-Log.

## Technische und organisatorische Maßnahmen

- Standardmäßig deaktivierte Verbindung.
- Konfiguration im verschlüsselten Vault.
- Harte Endpunkt-Whitelist für lesende Endpunkte und ausdrücklich freigegebene SBV-Arbeitsbereichsaktionen.
- Keine generische HTTP-Bridge im Renderer.
- Keine Hintergrundsynchronisation.
- Audit nur ohne Inhaltsdaten.
- Lokaler Lesecache mit sichtbarem Aktualisierungsstand.
- Feste Speicherbegrenzung des Lesecaches auf 30 Tage.
- Automatisches Leeren des Lesecaches bei deaktivierter Gremia.BR-Anbindung oder gelöschten Zugangsdaten.
- Löschung/Anonymisierung lokaler Referenzen folgt den Gremia.SBV-Datenschutzpfaden.

## Risikobewertung

Hauptrisiko ist nicht die technische Verbindung an sich, sondern eine Zweckverschiebung: BR-Daten könnten mit SBV-Falldaten vermischt oder SBV-Daten könnten unbeabsichtigt an Gremia.BR gelangen. Dies wird durch eine ausdrückliche Aktionspolicy, Whitelist, getrennte lokale Speicherung, fachlich begrenzte PDF-Übergaben und eine technische Cache-TTL von 30 Tagen begrenzt.

## Bewertung

Die Kooperationsbrücke ist vertretbar, wenn sie optional bleibt, keine Hintergrundprozesse auslöst und ausschließlich durch bewusste Nutzeraktion arbeitet. Die SBV-Datenhoheit bleibt bei Gremia.SBV; jede Übergabe an Gremia.BR muss fachlich sichtbar, begrenzt und nachvollziehbar bleiben.
