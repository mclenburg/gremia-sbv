# Amtsübergabe und Vertretung

Der Bereich **Übergaben** unterstützt zwei unterschiedliche Situationen:

- Eine **Urlaubs- oder Krankheitsvertretung** ist zeitlich begrenzt. Ausgewählte Fallakten werden an die Stellvertretung übergeben und Änderungen später als Rückgabe-Delta zurückgeführt.
- Eine **Amtsübergabe** ist dauerhaft. Die gewählte Nachfolge übernimmt den erforderlichen Arbeits- und Nachweisbestand in ihre eigene Gremia.SBV-Instanz.

Ein Übergabepaket ist weder ein Backup noch eine gemeinsame Datenbank. Beide Instanzen bleiben technisch selbstständig.

## Vor jeder Übergabe

Die Zielinstanz zeigt unter **Einstellungen** ihre Empfängerkennung an. Diese Kennung wird in der Quellinstanz eingefügt. Das Paket kann anschließend nur von dieser Zielinstanz entschlüsselt werden. Zusätzlich ist eine Transport-Passphrase mit mindestens zehn Zeichen erforderlich.

Übermittle Datei und Passphrase über getrennte Wege. Prüfe die Empfängerkennung sorgfältig, bevor du den Export speicherst.

## Urlaubsvertretung

1. Öffne **Übergaben**.
2. Wähle nur die Fallakten aus, die während der Vertretung bearbeitet werden müssen.
3. Trage Empfängerkennung, Transport-Passphrase und Vertretungsende ein.
4. Exportiere das Paket und übermittle Datei und Passphrase getrennt.
5. Die Stellvertretung prüft das Paket vor dem Import und übernimmt es als lokale Vertretungsakte.
6. Nach der Vertretung erzeugt sie im Übergabe-Cockpit ein Rückgabe-Delta für die geänderten Inhalte.
7. Die ursprüngliche SBV prüft und importiert das Delta. Die Zuordnung erfolgt über das protokollierte Ausgangspaket.

Abgelaufene Pakete dürfen nicht importiert werden. Bereits importierte Vertretungsdaten werden nach Ablauf sichtbar als prüfbedürftig markiert. Eine fachlich erforderliche Fortführung muss begründet werden.

## Amtsübergabe

Die Amtsübergabe enthält:

- die bewusst ausgewählten Fallakten mit Maßnahmen, Notizen, Dokumenten und Fristen,
- offene Datenschutzprüfungen dieser Fallakten,
- individuelle Dokumentvorlagen,
- Fristvorlagen und die konfigurierten Aufbewahrungsregeln,
- digitale Wahlakten einschließlich der in Gremia.SBV abgelegten Wahldokumente,
- Nachweise zu physischen Wahlunterlagen und bestehenden Aufbewahrungssperren.

Nicht enthalten sind:

- das persönliche Tätigkeitsjournal der bisherigen Amtsinhaberin oder des bisherigen Amtsinhabers,
- Passwörter, Recovery-Key, Gremia.BR-Zugangsdaten oder andere Geheimnisse,
- globale Programm- oder Gerätepfade,
- vollständige Backups,
- physische Originale der Wahlakte.

Ein bereits erzeugter, anonymisierter Tätigkeitsbericht kann übergeben werden, wenn er als erforderliches Dokument einem ausgewählten Vorgang zugeordnet ist. Die zugrunde liegenden persönlichen Journaleinträge werden nicht übertragen.

### Ablauf

1. Prüfe offene Fallakten, Fristen, Datenschutzaufträge und Wahlakten.
2. Wähle im Amtsübergabe-Bereich alle erforderlichen Fallakten aus.
3. Prüfe die angezeigten Anzahlen für Vorlagen, Fristenregeln, Wahlakten, Wahldokumente und Datenschutzaufträge.
4. Trage Empfängerkennung und Transport-Passphrase ein.
5. Bestätige den geprüften Umfang und exportiere das Paket.
6. Die Nachfolge wählt das Paket aus und prüft den Importplan vollständig.
7. Sie entscheidet ausdrücklich, ob übergebene Fristen- und Aufbewahrungsregeln die lokalen Regeln ersetzen sollen.
8. Erst danach wird der Amtsbestand als neuer lokaler Bestand importiert.
9. Die Nachfolge bearbeitet die erzeugten Datenschutzprüfungen und kontrolliert offene Fristen sowie Wahlunterlagen.

Fallakten werden bei einer Amtsübergabe nicht automatisch mit vorhandenen Akten zusammengeführt. Dadurch gelangen widersprüchliche Personen- oder Falldaten nicht unbemerkt in einen bestehenden Bestand.

## Wahlakten und physische Originale

Digitale Wahlunterlagen werden unverändert und verschlüsselt übertragen. Umlaute, Namen und rechtlich relevante Inhalte werden nicht ersetzt. Im Wahlmodul erfasste Hinweise auf versiegelte oder physisch aufzubewahrende Originale werden ebenfalls übernommen.

Die digitale Übertragung ersetzt keine Übergabe physischer Originalunterlagen. Übergabeort, versiegelter Zustand und empfangende Person müssen im Wahlvorgang beziehungsweise im Übergabeprotokoll dokumentiert werden.

## Ältere Übergabepakete

Gremia.SBV kann unterstützte ältere Paketversionen prüfen. Da diese noch nicht alle aktuellen Schutzmerkmale besitzen, reicht ein Warnhinweis nicht aus: Vor dem Import muss die Herkunft fachlich geprüft und der Altformat-Import ausdrücklich bestätigt werden. Unbekannte, manipulierte oder widersprüchliche Versionen werden abgewiesen.

## Nachkontrolle

Nach jeder Amtsübergabe sind mindestens zu prüfen:

- Sind alle ausgewählten Fallakten und offenen Fristen vorhanden?
- Lassen sich die übernommenen Dokumente öffnen?
- Sind Wahlakten und Hinweise auf physische Originale vollständig?
- Sind individuelle Vorlagen vorhanden?
- Passen die übernommenen Aufbewahrungsregeln zur Organisation?
- Werden offene Datenschutzaufträge im Datenschutz-Cockpit angezeigt?

Die Löschung oder Anonymisierung bleibt auch nach einer Übergabe eine bewusste manuelle Entscheidung.
