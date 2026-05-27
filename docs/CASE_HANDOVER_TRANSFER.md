# Fallübergabe und Vertretung

## Zweck

Die Fallübergabe unterstützt Situationen, in denen eine SBV einzelne Vorgänge zeitlich begrenzt an eine berechtigte Stellvertretung oder Nachfolge übergeben muss. Typische Anlässe sind Urlaub, Krankheit, Amtswechsel oder eine kurzfristige Vertretung bei laufenden Fristen.

Die Funktion ist kein Backup, keine Synchronisation und keine gemeinsame Datenbank. Jede Gremia.SBV-Instanz bleibt eigenständig.

## Grundprinzip

Eine ausgewählte Fallakte kann mit den zugehörigen, für die Vertretung erforderlichen Inhalten als verschlüsseltes Übergabepaket exportiert werden. Die empfangende Person importiert das Paket in ihrer eigenen Gremia.SBV-Instanz und entscheidet, ob daraus eine neue lokale Übergabeakte entsteht oder ob ein mögliches vorhandenes Gegenstück bewusst zusammengeführt beziehungsweise aktualisiert wird.

Das Übergabepaket hat die Dateiendung `.gsbvtransfer`.

## Ablauf für die abgebende SBV

1. Fallakte öffnen.
2. `Übergabe exportieren` wählen.
3. Transport-Passphrase vergeben.
4. Optional ein Gültig-bis-Datum setzen.
5. Export bestätigen.
6. Übergabedatei und Passphrase getrennt übermitteln.

Die Passphrase gehört nicht in dieselbe E-Mail oder denselben Chat wie die Datei. Sie soll über einen getrennten Kanal weitergegeben werden.

## Ablauf für die importierende SBV

1. In der Fallliste `Übergabe importieren` wählen.
2. Übergabedatei auswählen.
3. Passphrase eingeben.
4. Paket prüfen.
5. Vorschau lesen.
6. Bei gefundenen möglichen Gegenstücken entscheiden:
   - als neue lokale Übergabeakte anlegen, oder
   - bewusst mit einem vorgeschlagenen Gegenstück zusammenführen beziehungsweise aktualisieren.
7. Import bestätigen.

Ohne ausdrückliche Entscheidung findet keine Zusammenführung statt.

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
- Übergabedaten nach Ende der Vertretung prüfen, schließen, löschen oder begründet fortführen.
