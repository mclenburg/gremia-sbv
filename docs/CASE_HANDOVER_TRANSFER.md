# Fallübergabe und Vertretung

## Zweck

Die Übergabefunktion unterstützt zeitlich begrenzte Vertretungen, mobile Begleit-App-Projektionen und den dauerhaften Amtswechsel. Diese Vorgänge folgen unterschiedlichen Regeln und werden in der Anwendung ausdrücklich getrennt.

Die Funktion ist kein Backup, keine Synchronisation und keine gemeinsame Datenbank. Jede Gremia.SBV-Instanz bleibt eigenständig.

## Grundprinzip

Ausgewählte Fallakten können mit den zugehörigen erforderlichen Inhalten als verschlüsseltes, auf eine konkrete Zielinstanz gebundenes Übergabepaket exportiert werden. Bei einer Urlaubsvertretung kann ein einzelnes, sicher erkanntes Gegenstück bewusst zusammengeführt werden. Eine Amtsübergabe wird dagegen immer als neuer lokaler Amtsbestand übernommen.

Fall- und Amtsübergabepakete haben die Dateiendung `.gsbvtransfer`. Mobile Begleit-App-Projektionen nutzen ein eigenes, reduziertes Snapshot-Format und werden nicht als vollständige Fallübergabe behandelt.

## Ablauf für die abgebende SBV

1. Den Bereich `Übergaben` als letzten Punkt der Kernarbeit öffnen.
2. Das passende Register wählen: `Urlaubsvertretung`, `Begleit-App`, `Rückgabe`, `Amtsübergabe`, `Import` oder `Protokoll`.
3. Empfängerprofil wählen oder die vollständige öffentliche Empfängerkennung der Zielinstanz einfügen. Die Anwendung schlägt das neueste verifiziert lesbare Format vor und zeigt nur dessen Exportablauf. Ohne bestätigte Fähigkeit schlägt sie vorsichtig Format 2 vor; Format 4 bleibt wählbar. Format 5 setzt ein verifiziertes Zielprofil voraus.
4. Die angezeigte Zielinstanz-ID und das vorgeschlagene Format prüfen. Bei Format 5 offene Vorgänge aus Fallarbeit und Amtsarbeit über die filterbare Auswahl übernehmen; jeder Vorschlag und jedes Dokument muss bewusst ausgewählt werden. Formate 2 und 4 enthalten nur Fallakten.
5. Transport-Passphrase vergeben, sofern die gewählte Schutzart eine Passphrase verlangt.
6. Bei einer Vertretung ein verbindliches Enddatum setzen; Amtsübergaben haben kein Ablaufdatum.
7. Umfang, Dokumentnamen, Dokumentbytes, sensible Freitexte und Vertretungsende in der Vorschau prüfen und Export bestätigen.
8. Übergabedatei und Passphrase getrennt übermitteln.

Die Passphrase gehört nicht in dieselbe E-Mail oder denselben Chat wie die Datei. Sie soll über einen getrennten Kanal weitergegeben werden.

Format 5 kann ohne Fallakte nur fallfreie Fristen oder Amtsvorgänge übertragen. Ein kurzer Übergabehinweis für Prioritäten und nächste Schritte ist optional und wird mit dem Paket verschlüsselt. Bei Änderungen an der Auswahl muss die Vorschau erneut bestätigt werden.

## Ablauf für die importierende SBV

1. Den Bereich `Übergaben` öffnen.
2. Das Register `Import` öffnen.
3. Übergabedatei einmal auswählen. Die Anwendung ordnet sie anhand der Hülle dem passenden Importablauf zu; die Hülle allein ist noch kein Integritätsnachweis.
4. Passphrase eingeben, sofern das Paket passwortgeschützt ist.
5. Paket prüfen.
6. Vorschau lesen.
7. Bei einer Urlaubsvertretung und gefundenen möglichen Gegenstücken entscheiden:
   - als neue lokale Übergabeakte anlegen, oder
   - bewusst mit einem vorgeschlagenen Gegenstück zusammenführen beziehungsweise aktualisieren.
8. Import bestätigen.

Ohne ausdrückliche Entscheidung findet keine Zusammenführung statt.

Bei Format 5 zeigt die Importvorschau Vorgangsgruppen, Dokumentnamen und deren Umfang. Der Import legt fremde Vorgänge mit neuen lokalen IDs an und hält die Paketbezüge für eine spätere Rückgabe fest. Die Vertretung sieht den verschlüsselten Übergabehinweis in der Übersicht. Für die Rückgabe wird das aktive Ausgangspaket ausgewählt; geänderte Vorgänge, neue Vorgänge, Dokumente und begründete Stornowünsche werden vor dem Export einzeln geprüft. Ein Stornowunsch löscht auf der Ausgangsinstanz nichts automatisch. Die Ausgangsinstanz prüft die Rückgabe auf Konflikte und bestätigt die Übernahme ausdrücklich.

Bei einer Amtsübergabe entscheidet die Nachfolge zusätzlich, ob die übergebenen Frist- und Aufbewahrungsregeln lokal übernommen werden. Individuelle Vorlagen werden ohne Überschreiben abweichender lokaler Vorlagen importiert.

## Eigenständige Instanzen

Gremia.SBV ist offline-first und instanzunabhängig. Deshalb gilt:

- Original-IDs aus der exportierenden Instanz werden nicht als fachliche Identität übernommen.
- Paketinterne Referenzen dienen nur dazu, Beziehungen innerhalb des Pakets wiederherzustellen.
- Beim Import entstehen lokale IDs der importierenden Instanz.
- Es gibt keine automatische Synchronisation zwischen exportierender und importierender Anwendung.
- Ein Re-Import schreibt nicht automatisch zurück in die abgebende Instanz.

## Suche nach möglichen Gegenstücken

Beim Import kann die Anwendung mögliche Gegenstücke vorschlagen. Die Suche orientiert sich an fachlichen Merkmalen wie Aktenzeichen, Anzeigename oder Personenname. Diese Vorschläge sind Entscheidungshilfen, keine automatische Identitätsfeststellung.

Die nutzende Person entscheidet, ob der Import neu angelegt oder mit einem gefundenen Gegenstück zusammengeführt beziehungsweise aktualisiert wird.

Gremia.SBV erstellt vor dem Import einen Importplan. Dieser Plan zeigt Umfang, Ablaufdatum, Datenschutzfolge und die Bewertung gefundener Gegenstücke:

- Ein sicherer Treffer liegt nur vor, wenn genau ein fachliches Gegenstück ohne widersprechenden Personenbezug gefunden wird.
- Namens- oder Anzeigenamens-Treffer sind mögliche Treffer. Sie dürfen nicht stillschweigend als Identität gewertet werden.
- Ein echter Konflikt liegt vor, wenn ein starkes fachliches Kennzeichen wie das Aktenzeichen passt, Name oder Personenbezug aber widersprechen.

Bei echten Konflikten ist eine Zusammenführung technisch gesperrt. Das Paket kann dann nur als neue lokale Übergabeakte importiert und anschließend fachlich geprüft werden. Dadurch bleibt die empfangende SBV arbeitsfähig, ohne fremde oder widersprüchliche Daten in einen bestehenden Fall zu mischen.

Bei einer Rückgabe vergleicht die Ausgangsinstanz vorhandene Fristen und Maßnahmen vor einer Aktualisierung mit dem beim Export protokollierten Inhaltsstand. Ist der Ausgangsvorgang inzwischen verändert oder entfernt, wird der Import als Konflikt gestoppt; bereits begonnene Datenbank- und Dateischritte werden zurückgerollt. Ältere Exportprotokolle ohne Inhalts-Hash verwenden als Kompatibilitätsgrenze den Exportzeitpunkt.

Nach jedem erfolgreichen Import entsteht für die betroffenen Fallakten ein konkreter Datenschutzprüfauftrag. Diese Vormerkung ersetzt keine automatische Löschung. Sie zwingt nur zur bewussten Prüfung von Zweck, Vertretungsende, Fortführung oder Bereinigung der übernommenen Daten.

## Gültigkeit und Ablaufdatum

Beim Export kann ein Gültig-bis-Datum gesetzt werden. Dieses Datum begrenzt die Nutzbarkeit des Übergabepakets und die Vertretungszeit der importierten Daten.

Wichtig:

- Bereits abgelaufene Übergabepakete dürfen nicht importiert werden.
- Nach erfolgreichem Import bleiben die Daten bis zum Ablaufdatum bearbeitbar.
- Wird die Vertretungszeit nach dem Import überschritten, markiert Gremia.SBV die betroffenen Übergabedaten als abgelaufen.
- Weitere Bearbeitung abgelaufener importierter Übergabedaten muss bewusst bestätigt und begründet werden.

Damit bleibt die SBV in echten Eilfällen handlungsfähig, ohne dass abgelaufene Vertretungsdaten unbemerkt weiterverarbeitet werden.

## Enthaltene Daten

Ein Übergabepaket kann fallbezogen insbesondere enthalten:

- Fallakte und Fallgrunddaten,
- Personenbezug, soweit für die Vertretung erforderlich,
- Notizen und Protokolle,
- Maßnahmen,
- Maßnahmennotizen,
- Fristen und Wiedervorlagen,
- verknüpfte Dokumente.

Nicht Bestandteil einer Fallübergabe sind globale App-Einstellungen, Gremia.BR-Zugangsdaten oder vollständige Backups. Format 5 kann ausgewählte fallfreie Fristen und Amtsvorgänge einschließlich ausdrücklich gewählter zugehöriger Dokumente enthalten.

Eine Amtsübergabe ergänzt diesen Umfang um individuelle Vorlagen, Frist- und Aufbewahrungsregeln, offene Datenschutzprüfungen der ausgewählten Fälle sowie digitale Wahlakten einschließlich ihrer Dokumente. Das persönliche Tätigkeitsjournal ist ausdrücklich ausgeschlossen. Bereits erzeugte anonymisierte Tätigkeitsberichte können nur als erforderliche, zugeordnete Dokumente Bestandteil des Pakets sein.

## Begleit-App-Abgrenzung

Die Android-Begleit-App erhält keinen vollständigen Fallaktenexport. Sie arbeitet mit einer zielgebunden verschlüsselten Projektion für ein gekoppeltes Gerät.

Die Kopplung erfolgt nicht durch blindes Speichern einer öffentlichen Gerätekennung. Die Desktop-Anwendung erzeugt eine Pairinganfrage für die aktuelle Gremia.SBV-Instanz. Die Begleit-App beantwortet diese Anfrage mit ihrer öffentlichen mobilen Empfängerkennung. Gremia.SBV speichert das Gerät erst, wenn die Pairingantwort zur lokalen Desktop-Instanz passt und der in beiden Anwendungen angezeigte Sicherheitscode manuell bestätigt wurde.

Die Desktop-Anwendung überträgt diese Projektion als automatisch wechselnde QR-Frame-Serie. Standard ist ein kamerafreundliches Tempo von zwei Frames pro Sekunde; für ältere Geräte steht ein kompatibler Modus mit einem Frame pro Sekunde bereit. Jeder Frame enthält Sitzung, Reihenfolge, Payload-Länge, Paket-Hash und Chunk-Checksumme, damit die Begleit-App verlorene, doppelte oder falsche Frames sicher erkennen kann. Der Ablauf besitzt Pause, manuelles Weiterschalten, Abbruch und ein sichtbares Zeitfenster. Die Fallauswahl ist filterbar und fachlich auf offene Arbeitsfälle begrenzt.

Enthalten sind:

- ausgewählte Fallköpfe mit Aktenzeichen, Anzeigename, Kategorie, Status und Priorität,
- offene fallbezogene Fristen mit Fälligkeit, Rechtsgrundlage und Schweregrad,
- technische Synchronisations- und Anzeigeinformationen.

Nicht enthalten sind:

- Gesprächsnotizen,
- Maßnahmennotizen,
- Dokumentdateien oder Dokumentnamen,
- vollständige Fallzusammenfassungen,
- globale Einstellungen, Zugangsdaten oder Backups.

Damit bleibt der Desktop-Tresor fachlich führend. Die mobile Projektion hilft bei der Arbeit unterwegs, ohne aus der Begleit-App eine zweite vollständige Gremia.SBV-Instanz zu machen.

### Mobile Rückgabe

Die Begleit-App liefert Besprechungsnotizen, neue Wiedervorlagen und erledigte Fristen als verschlüsselte `.gsbvmobile`-Rückgabedatei zurück. Die Datei wird über den Android-Dokumentdialog an einem bewusst gewählten Speicherort abgelegt. Gremia.SBV entschlüsselt diese Datei nur auf der Zielinstanz, zeigt vor dem Schreiben einen Importplan und übernimmt konfliktfreie Änderungen über die bestehenden Fallnotiz- und Fristenservices.

Konflikte blockieren den Import vollständig. Das gilt insbesondere für unbekannte oder deaktivierte Mobilgeräte, gelöschte oder abgeschlossene Fallakten und Fristen, deren Desktop-Stand seit dem Mobile-Snapshot geändert wurde. Audit- und Importprotokolle enthalten nur technische Zähldaten, keine Notiztexte oder sonstigen Freitextinhalte.

## Unterstützte Paketversionen

Neue Übergaben verwenden das aktuelle zielgebundene Format. Unterstützte ältere Formate können weiterhin geprüft werden, erfordern vor dem Import aber eine gesonderte ausdrückliche Bestätigung. Pakethülle und Nutzdaten müssen dieselbe Version tragen. Amtsdaten sind ausschließlich im aktuellen Format zulässig; unbekannte Versionen und unerwartete Datenbereiche werden abgewiesen.

Für eine bewusst gewählte ältere Zielinstanz kann eine Urlaubsvertretung mit ausgewählten Fallakten ausdrücklich als Format 2 geschrieben werden. Dabei sind Empfängerschlüssel und Transport-Passphrase erforderlich. Das Format wird vor dem Aufbau der Nutzdaten geprüft; Amtsdaten und die Schutzart ohne Passphrase sind damit nicht kombinierbar. Die ältere Zielanwendung muss Format 2 tatsächlich lesen können. Der Rückgabeweg einer älteren Zielanwendung ist dadurch nicht zugesagt.

Bekannte Instanzen können ihre Übergabefähigkeiten offline austauschen: Unter **Einstellungen > Übergaben** wird für ein aktives Empfängerprofil eine kleine `.gsbvcap`-Datei erzeugt. Die Gegeninstanz wählt diese Datei beim zugehörigen Profil aus, prüft Instanz-ID, vollständigen Fingerprint, Lese- und Schreibformate sowie Merkmale und übernimmt sie ausdrücklich. Die Datei bindet Absender, Ziel, Inhalt und Ausgabezeitpunkt kryptografisch an die beiden bekannten X25519-Schlüssel. Ein unbekannter oder ausgetauschter Schlüssel benötigt weiterhin eine unabhängig bestätigte Empfängerkennung und ein neues Profil. Ältere Revisionsstände setzen bereits bestätigte Fähigkeiten nicht zurück; deaktivierte Profile werden dadurch nicht aktiviert. Die aktuelle Anwendung meldet Formate 1–5 zum Lesen und 2/4/5 zum Schreiben. Die angezeigte Softwareversion ist informativ und schaltet keine Paketformate frei.

Bei Auswahl eines verifizierten Empfängerprofils schlägt die Urlaubsübergabe das neueste gemeinsame Format aus 5, 4 und 2 vor; Format 5 benötigt zusätzlich das bestätigte Merkmal `vacation_scope_v5`. Ein Format, das die bestätigte Gegeninstanz nicht lesen kann, wird auch im Export-Service vor Datensammlung und Dateischreiben gesperrt. Bei unbekannter Fähigkeit wird Format 2 als frühester noch schreibbarer Stand vorgeschlagen; Format 4 bleibt auswählbar. Die tatsächliche Unterstützung ist dann unabhängig zu prüfen, und die Rückgabefähigkeit einer älteren Gegeninstanz ist nicht zugesagt. Die Importseite erkennt das Format der ausgewählten Datei automatisch und verlangt danach die vollständige kryptografische Prüfung.

Die erweiterte Urlaubsvertretung mit Format 5 benötigt ein aktives Empfängerprofil, dessen Format-5-Lesefähigkeit und Merkmal `vacation_scope_v5` offline bestätigt wurden. Sie ist ein eigener Exportweg. Die fallbezogenen Formate 4 und 2 bleiben für bekannte ältere Gegeninstanzen verfügbar.

## Datenschutz und Audit

Export, Import, abgelehnte Importe und die Weiterbearbeitung abgelaufener Übergabedaten werden auditiert. Das Audit-Log darf dabei nicht selbst zum Datenschutzproblem werden.

Protokolliert werden nur technische und organisatorische Eckdaten, zum Beispiel:

- Paketkennung,
- Zeitpunkt,
- Aktion,
- Ergebnis,
- Anzahl exportierter oder importierter Fallakten, Maßnahmen, Dokumente und Fristen,
- bei Mobile-Snapshots zusätzlich Frame-Anzahl und Zielinstanz,
- ob ein Ablaufdatum gesetzt wurde,
- Importmodus.

Nicht ins Audit-Log gehören:

- Personennamen,
- Diagnosen,
- Falltitel,
- Notizinhalte,
- Dokumentnamen,
- Passphrase,
- Inhalte des Übergabepakets.

## Abgrenzung zu Backup und Export

Die Fallübergabe ersetzt kein Backup. Ein Backup dient der Wiederherstellung des eigenen Vaults. Die Fallübergabe dient einer selektiven, zweckgebundenen Vertretung.

Die Fallübergabe ersetzt auch keinen Klartext-Dokumentenexport. Ein Dokumentenexport erzeugt eine Datei außerhalb des Vaults und muss besonders vorsichtig genutzt werden. Die Fallübergabe bündelt ausgewählte Inhalte in einem verschlüsselten Transportpaket.

## Praktische Mindestregeln

- Nur erforderliche Fälle exportieren.
- Ablaufdatum setzen, wenn die Vertretung zeitlich begrenzt ist.
- Datei und Passphrase getrennt übermitteln.
- Importvorschau prüfen.
- Zusammenführung nur bewusst durchführen.
- Echte Konflikte nicht zusammenführen, sondern als neue Übergabeakte fachlich prüfen.
- Nach Import den Datenschutzprüfauftrag bearbeiten.
- Übergabedaten nach Ende der Vertretung prüfen, schließen, löschen oder begründet fortführen.
