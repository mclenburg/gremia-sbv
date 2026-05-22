# Datenschutzbewertung zur Gremia.BR-Lesebrücke

Dieses Dokument beschreibt die datenschutzrechtliche Einordnung der optionalen Gremia.BR-Lesebrücke in Gremia.SBV.

## Verarbeitungstätigkeit

**Bezeichnung:** Lesender Abruf ausgewählter BR-Informationen aus Gremia.BR  
**Zweck:** Unterstützung der Zusammenarbeit zwischen Betriebsrat und Schwerbehindertenvertretung  
**System:** Gremia.SBV, lokaler SQLCipher-Vault  
**Quelle:** Gremia.BR-Server des Betriebsrats  
**Richtung:** Gremia.BR → Gremia.SBV, ausschließlich lesend

## Verarbeitete Daten

Möglich sind:

- Sitzungstitel und Sitzungstermine,
- Tagesordnungspunkte,
- Beschlussmetadaten,
- Beschlusstitel und ggf. Beschlusstexte, soweit aus Gremia.BR bereitgestellt,
- technische Verbindungsdaten,
- lokale Referenzen auf BR-Elemente.

Nicht verarbeitet werden dürfen:

- SBV-Falldaten auf dem Gremia.BR-Server,
- Gesundheitsdaten aus Gremia.SBV,
- Passwörter oder Tokens in Logs,
- Suchbegriffe im Audit-Log.

## Technische und organisatorische Maßnahmen

- Standardmäßig deaktivierte Verbindung.
- Konfiguration im verschlüsselten Vault.
- Harte Endpunkt-Whitelist.
- Keine generische HTTP-Bridge im Renderer.
- Keine Hintergrundsynchronisation.
- Audit nur ohne Inhaltsdaten.
- Lokaler Lesecache mit sichtbarem Aktualisierungsstand.
- Löschung/Anonymisierung lokaler Referenzen folgt den Gremia.SBV-Datenschutzpfaden.

## Risikobewertung

Hauptrisiko ist nicht die technische Verbindung an sich, sondern eine Zweckverschiebung: BR-Daten könnten mit SBV-Falldaten vermischt oder SBV-Daten könnten unbeabsichtigt an Gremia.BR gelangen. Dies wird durch Read-only-Policy, Whitelist, fehlende Schreibmethoden und getrennte lokale Speicherung begrenzt.

## Bewertung

Die Lesebrücke ist vertretbar, wenn sie optional bleibt, keine Hintergrundprozesse auslöst und ausschließlich durch bewusste Nutzeraktion arbeitet. Die SBV-Datenhoheit bleibt bei Gremia.SBV.
