# Wahlen

## Zweck des Wahlbereichs

Die Ansicht **Wahlen** unterstützt die örtliche Wahl der Schwerbehindertenvertretung von der Einleitung bis zum dokumentierten Abschluss und zur Amtsübergabe. Der Bereich führt die Wahl als eigene Wahlakte und trennt Vorbereitung, Durchführung, Ergebnis und Archivierung.

Die Anwendung trifft keine Wahlentscheidung. Sie unterstützt die Dokumentation des tatsächlichen Wahlverfahrens und speichert insbesondere **keine individuelle Stimmabgabe**.

## Wahlworkflow

Der Wahlbereich ist in zehn Arbeitsabschnitte gegliedert:

1. **Einleitung** – Wahlgrund, Mindestschwelle und Verfahren,
2. **Wahlorgan** – Wahlvorstand oder Wahlleitung,
3. **Wählerliste** – Snapshot der Wahlberechtigten und Einsprüche,
4. **Vorschläge** – Kandidaturen und Wahlvorschläge,
5. **Vorbereitung** – vorbereitende Wahlunterlagen,
6. **Stimmabgabe** – Stimmzettel und Wahltag,
7. **Briefwahl** – Versand, Eingang und verspätete Wahlbriefe,
8. **Auszählung** – aggregierte Stimmen und Losentscheid,
9. **Annahme** – Benachrichtigung, Annahme und Nachrücken,
10. **Abschluss** – Bekanntmachung, Wahlakte und Übergabe.

Der Button **? Hilfe** rechts oben im jeweiligen Arbeitsbereich erklärt den aktuellen Abschnitt. Über **Tätigkeit erfassen** kannst du die passende Wahlhandlung bewusst in das Tätigkeitsjournal übernehmen.

## Einleitung und Wahlorgan

Zu Beginn wird ein Wahlvorgang angelegt und der organisatorische Rahmen dokumentiert. Dazu gehören der Wahlgrund, die festgestellte Mindestschwelle, das anzuwendende Verfahren und das zuständige Wahlorgan.

Die Anwendung dient dabei als Dokumentations- und Arbeitswerkzeug. Sie ersetzt nicht die rechtliche Prüfung, welches Verfahren im konkreten Betrieb tatsächlich anzuwenden ist.

## Wählerliste und Wahlvorschläge

Die Wählerliste wird als Wahl-Snapshot geführt, damit der dokumentierte Stand der Wahlakte nachvollziehbar bleibt. Standardmäßig wird sie aus dem Personenverzeichnis übernommen: aktive schwerbehinderte und gleichgestellte Personen werden als eigenständige Arbeitskopie in die Wahlakte synchronisiert. Änderungen im Personenverzeichnis können erneut übernommen werden; nicht mehr wahlberechtigte zuvor synchronisierte Einträge werden dabei als nicht wahlberechtigt markiert, nicht still gelöscht. Alternativ kann dieselbe Excel-/CSV-Struktur wie beim Personenimport direkt in die Wählerliste eingelesen werden. Die Datei verändert dabei das Personenverzeichnis nicht. Die manuelle Erfassung einzelner Wahlberechtigter bleibt als nachrangige Ergänzung verfügbar. Der historische Wahlberechtigten-Snapshot aus der Verfahrensprüfung wird durch spätere Übernahmen nicht automatisch neu berechnet. Einsprüche und ihre Bearbeitung können getrennt nachgehalten werden.

Kandidaturen und Wahlvorschläge werden als Wahlvorgänge dokumentiert. Personenbezogene Daten sollten auch hier auf das für die Durchführung der Wahl Erforderliche begrenzt bleiben.

## Wahlunterlagen und Stimmabgabe

Im Abschnitt **Vorbereitung** können die vorgesehenen Wahlunterlagen erzeugt und nachgehalten werden. Die Durchführung am Wahltag wird anschließend im Abschnitt **Stimmabgabe** dokumentiert.

Gremia.SBV speichert keine Information darüber, **welche Person welche Stimme abgegeben hat**. Die Wahlhandlung einzelner Wählerinnen und Wähler darf aus der Wahlakte nicht rekonstruierbar sein.

## Briefwahl

Für die Briefwahl können Versand und Eingang der Wahlunterlagen organisatorisch dokumentiert werden. Auch verspätete Wahlbriefe werden als Verfahrensereignis erfasst, ohne eine individuelle Wahlentscheidung zu speichern.

Über **Briefwahlpaket mit Merkblatt erzeugen** entsteht ein mehrseitiges PDF für genau eine wahlberechtigte Person. Vor der Erzeugung wählst du die Person über die filterbare Wählerlistensuche aus und trägst ihre Postanschrift, die Postanschrift des Wahlvorstands sowie das Ende der Stimmabgabe ein. Diese Angaben werden für Stimmzettel, persönliche Erklärung, Umschlagbeschriftungen und das Merkblatt verwendet. Prüfe die Angaben vor dem Ausdruck sorgfältig.

Das PDF ersetzt nicht das vollständige reale Versandpaket. Lege zusätzlich das gültige Wahlausschreiben, einen Wahlumschlag und einen ausreichend frankierten größeren Rückumschlag bei. Der Rückumschlag muss die Anschrift des Wahlvorstands, Namen und Anschrift der wahlberechtigten Person als Absender sowie den Vermerk **Schriftliche Stimmabgabe** tragen. Übergabe oder Versand werden anschließend im Briefwahltracking dokumentiert.

Physische Wahlunterlagen bleiben physische Originale. Ein erzeugtes PDF oder eine digitale Wahlakte ersetzt insbesondere aufzubewahrende Stimmzettel oder andere gesetzlich beziehungsweise organisatorisch erforderliche Originalunterlagen nicht.

## Auszählung und Losentscheid

Bei der Auszählung werden **nur aggregierte Stimmenzahlen** dokumentiert. Ein tatsächlicher Gleichstand wird von der Anwendung nicht automatisch aufgelöst.

Ist ein Losentscheid erforderlich, dokumentiert Gremia.SBV ausschließlich den real vom zuständigen Wahlorgan durchgeführten und festgestellten Losentscheid. Die Software zieht kein eigenes Los und bestimmt keine gewählte Person.

## Annahme und Nachrücken

Im Abschnitt **Annahme** werden Benachrichtigung und Annahmestatus der gewählten Personen nachgehalten. Eine ausdrückliche Annahme, Annahme durch Fristablauf oder Ablehnung wird als tatsächlicher Verfahrensstand dokumentiert.

Bei einer Ablehnung kann das fachlich vorgesehene Nachrücken in der Wahlakte nachgehalten werden. Die Anwendung ersetzt auch hier nicht die Entscheidung des Wahlorgans.

## Abschluss und Wahlakte

Der Abschluss bündelt Bekanntmachung, Benachrichtigungen, Aufbewahrungsangaben und die dokumentierte Amtsübergabe. Vor dem Schließen des Wahlvorgangs prüft die Anwendung, ob die für den eigenen Workflow erforderlichen Abschlussinformationen vorliegen.

Für die Wahlakte können unter anderem erzeugt werden:

- Stimmzettel für Vertrauensperson und Stellvertretung,
- Briefwahlpaket mit Merkblatt, persönlicher Erklärung und Umschlagbeschriftungen,
- Ergebnisniederschrift,
- Benachrichtigung,
- Bekanntmachung des Wahlergebnisses,
- Inventar der physischen Wahlunterlagen,
- Übergabedokumentation,
- zusammengefasste Wahlakte.

## Geschützte Übergabe an eine andere Installation

Eine Wahlakte kann über den vorgesehenen **geschützten Wahltransfer** an eine andere Gremia.SBV-Installation übergeben werden. Das Transferpaket ist passwortgeschützt und wird vor dem Import auf Format, Integrität und interne Referenzen geprüft.

Beim Import werden technische IDs in der Zielinstallation neu zugeordnet. Die lokale Auditkette der Zielinstallation bleibt eine eigene Auditkette; die Auditkette der Quellinstallation wird nicht fortgeschrieben oder als lokale Historie ausgegeben.

Ein fehlerhaftes, manipuliertes oder nicht zur Passphrase passendes Paket soll keinen teilweise importierten Wahlbestand hinterlassen.

## Datenschutz und Aufbewahrung

Die Wahlakte enthält personenbezogene und organisatorische Wahldaten. Erfasse nur Informationen, die für die Durchführung, Nachvollziehbarkeit und Aufbewahrung der Wahl erforderlich sind.

Digitale Dokumente, Backup und geschützter Transfer dienen der sicheren Arbeits- und Übergabeunterstützung. Sie ändern nicht die Pflicht, erforderliche physische Originalunterlagen getrennt und ordnungsgemäß aufzubewahren.
