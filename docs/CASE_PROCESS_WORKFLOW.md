# Fallakten-Workflow

## Grundsatz

Die Fallakte ist der führende Arbeitsraum für SBV-Vorgänge. Sie bündelt Beratungsanlass, Personenbezug, Notizen, Dokumente, Maßnahmen, Fristen und Verlauf.

Reguläre neue Fallakten werden an eine Person im Personenverzeichnis gebunden. Wenn keine Identität genannt werden soll oder darf, wird eine anonyme Beratungsanfrage angelegt.

## Fallakte anlegen

Zielablauf:

1. Person suchen,
2. Person auswählen oder neu anlegen,
3. alternativ anonyme Beratungsanfrage dokumentieren,
4. Fallakten-Grunddaten erfassen,
5. Fallakte anlegen.

Die Personenbindung ist kein Selbstzweck. Sie dient der sicheren Wiederauffindbarkeit, Fristensteuerung, Datenschutzprüfung, Art.-15-Auskunftsfähigkeit und Vermeidung verstreuter Schattennotizen.

## Anonyme Beratungsanfrage

Eine anonyme Anfrage ist ein bewusster Sonderweg. Sie ist sinnvoll, wenn eine ratsuchende Person zunächst keine Identität offenlegen möchte oder wenn ein Vorgang ohne Personenbindung dokumentiert werden muss.

Anonyme Vorgänge dürfen nicht nachträglich geratenhaft aus Freitexten einer Person zugeordnet werden. Eine spätere Zuordnung braucht eine bewusste Entscheidung.

## Fallakte bearbeiten

In der Fallakte werden Notizen, Dokumente, Maßnahmen und Fristen zusammengeführt. Große Freitexte sind besonders sensibel. Sie können Gesundheitsdaten, Angaben zur Schwerbehinderung, Aussagen Dritter oder Konfliktverläufe enthalten und sind deshalb in Datenschutzprüfung, Auskunft, Löschung und Übergabe einzubeziehen.

## Fallübergabe / Vertretung

Aus einer Fallakte kann eine verschlüsselte Übergabedatei für Vertretung oder Nachfolge erzeugt werden. Der Export ist selektiv und ersetzt weder Backup noch Synchronisation.

Beim Import in einer anderen Gremia.SBV-Instanz entstehen grundsätzlich lokale Datensätze. Findet die Anwendung mögliche Gegenstücke, entscheidet die nutzende Person ausdrücklich zwischen neuer Übergabeakte und Zusammenführung beziehungsweise Aktualisierung.

Details stehen in `CASE_HANDOVER_TRANSFER.md`.

## Ungeklärte Personenbindung

Fallakten dürfen nicht geratenhaft aus Freitexten mit Personen verknüpft werden. Wenn beim Import, bei einer Übergabe oder bei einer Datenübernahme kein eindeutiger Personenbezug vorliegt, wird der Vorgang prüfpflichtig markiert.

Die nutzende SBV entscheidet dann ausdrücklich, ob die Fallakte:

- einer bestehenden Person zugeordnet,
- als anonyme Anfrage weitergeführt,
- begründet fortgespeichert,
- anonymisiert oder
- gelöscht wird.

## Datenschutzprüfung

Eine Fallakte wird prüfpflichtig bei:

- Schutzstatus abgelaufen,
- Beschäftigung beendet,
- Person anonymisiert,
- Person gelöscht,
- ungeklärtem Personenbezug,
- importierten Übergabedaten nach Ablauf der Vertretungszeit.

Entscheidungsmöglichkeiten:

- Status aktualisieren,
- Fortspeicherung begründen,
- anonymisieren,
- löschen,
- bei abgelaufenen Übergabedaten weitere Bearbeitung begründen.

## Barrierefreiheit

Fallakte-anlegen-Dialog, Personenauswahl, anonyme Anfrage, Übergabeimport und Datenschutzdialog müssen per Tastatur bedienbar sein, Fokus korrekt führen und verständliche Rückmeldungen ausgeben.
