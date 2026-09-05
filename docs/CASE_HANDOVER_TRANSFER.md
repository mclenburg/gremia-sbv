# Fallübergabe und Vertretung

## Zweck

Die Übergabefunktion unterstützt sowohl zeitlich begrenzte Vertretungen als auch den dauerhaften Amtswechsel. Beide Vorgänge folgen unterschiedlichen Regeln und werden in der Anwendung ausdrücklich getrennt.

Die Funktion ist kein Backup, keine Synchronisation und keine gemeinsame Datenbank. Jede Gremia.SBV-Instanz bleibt eigenständig.

## Grundprinzip

Ausgewählte Fallakten können mit den zugehörigen erforderlichen Inhalten als verschlüsseltes, auf eine konkrete Zielinstanz gebundenes Übergabepaket exportiert werden. Bei einer Urlaubsvertretung kann ein einzelnes, sicher erkanntes Gegenstück bewusst zusammengeführt werden. Eine Amtsübergabe wird dagegen immer als neuer lokaler Amtsbestand übernommen.

Das Übergabepaket hat die Dateiendung `.gsbvtransfer`.

## Ablauf für die abgebende SBV

1. Den Bereich `Übergaben` öffnen.
2. Übergabetyp und erforderliche Fallakten auswählen.
3. Empfängerkennung der Zielinstanz einfügen.
4. Transport-Passphrase vergeben.
5. Bei einer Vertretung ein verbindliches Enddatum setzen; Amtsübergaben haben kein Ablaufdatum.
6. Umfang prüfen und Export bestätigen.
7. Übergabedatei und Passphrase getrennt übermitteln.

Die Passphrase gehört nicht in dieselbe E-Mail oder denselben Chat wie die Datei. Sie soll über einen getrennten Kanal weitergegeben werden.

## Ablauf für die importierende SBV

1. Den Bereich `Übergaben` öffnen.
2. Übergabedatei auswählen.
3. Passphrase eingeben.
4. Paket prüfen.
5. Vorschau lesen.
6. Bei einer Urlaubsvertretung und gefundenen möglichen Gegenstücken entscheiden:
   - als neue lokale Übergabeakte anlegen, oder
   - bewusst mit einem vorgeschlagenen Gegenstück zusammenführen beziehungsweise aktualisieren.
7. Import bestätigen.

Ohne ausdrückliche Entscheidung findet keine Zusammenführung statt.

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

Nicht Bestandteil einer Fallübergabe sind globale App-Einstellungen, Gremia.BR-Zugangsdaten, vollständige Backups oder nicht fallbezogene Datenbestände.

Eine Amtsübergabe ergänzt diesen Umfang um individuelle Vorlagen, Frist- und Aufbewahrungsregeln, offene Datenschutzprüfungen der ausgewählten Fälle sowie digitale Wahlakten einschließlich ihrer Dokumente. Das persönliche Tätigkeitsjournal ist ausdrücklich ausgeschlossen. Bereits erzeugte anonymisierte Tätigkeitsberichte können nur als erforderliche, zugeordnete Dokumente Bestandteil des Pakets sein.

## Unterstützte Paketversionen

Neue Übergaben verwenden das aktuelle zielgebundene Format. Unterstützte ältere Formate können weiterhin geprüft werden, erfordern vor dem Import aber eine gesonderte ausdrückliche Bestätigung. Pakethülle und Nutzdaten müssen dieselbe Version tragen. Amtsdaten sind ausschließlich im aktuellen Format zulässig; unbekannte Versionen und unerwartete Datenbereiche werden abgewiesen.

## Datenschutz und Audit

Export, Import, abgelehnte Importe und die Weiterbearbeitung abgelaufener Übergabedaten werden auditiert. Das Audit-Log darf dabei nicht selbst zum Datenschutzproblem werden.

Protokolliert werden nur technische und organisatorische Eckdaten, zum Beispiel:

- Paketkennung,
- Zeitpunkt,
- Aktion,
- Ergebnis,
- Anzahl exportierter oder importierter Fallakten, Maßnahmen, Dokumente und Fristen,
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
