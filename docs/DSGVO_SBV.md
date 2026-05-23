# DSGVO und SBV-Arbeit mit Gremia.SBV

Stand: **0.9.2**

## Zweck

Dieses Dokument beschreibt DSGVO-relevante Leitplanken für die Nutzung von Gremia.SBV durch Schwerbehindertenvertretungen.

## Besonders sensible Daten

SBV-Fallarbeit kann Art. 9 DSGVO-Daten betreffen, insbesondere Gesundheitsdaten, Angaben zur Schwerbehinderung, Gleichstellung, BEM, Prävention, Kündigungsschutz und Arbeitsplatzanpassung.

## Rechtsgrundlagen und Aufgabenbezug

Die Verarbeitung ist organisatorisch zu prüfen. Relevant sind insbesondere Art. 6 Abs. 1 lit. c DSGVO, Art. 9 Abs. 2 lit. b DSGVO, § 26 Abs. 3 BDSG, § 163 SGB IX, § 164 Abs. 4 SGB IX, § 178 Abs. 1 SGB IX und § 178 Abs. 2 Satz 1 SGB IX.

## Datenminimierung

- Schutzstatus statt GdB als Regel im Personenverzeichnis.
- GdB-Beratung bleibt Beratungsthema, aber kein Pflichtfeld.
- Anonyme Beratungsanfrage ohne Direktidentifikatoren.
- Importdateien werden nicht dauerhaft gespeichert.
- Kalenderexporte enthalten standardmäßig keine Personendaten.

## ExportGuard

Für DOCX-, PDF-, Dokumenten- und Übergabeexporte soll grundsätzlich eine bewusste Bestätigung erforderlich sein. iCal-Export ist ebenfalls ein Export und muss datensparsam sein.

## Übergabe / Vertretung

Übergaben an Stellvertretung oder Nachfolge sind selektiv, zweckgebunden und mit Ablaufdatum vorzusehen. Es gibt keine automatische Vollsynchronisation und keine gemeinsame Datenbank. Jede Gremia.SBV-Instanz bleibt eigenständig.

Abgelaufene Übergabepakete dürfen nicht importiert werden. Bei bereits importierten Übergabedaten markiert die App den Vorgang nach Ablauf der Vertretungszeit als abgelaufen. Weitere Bearbeitung ist nur nach bewusster Bestätigung mit Begründung vorgesehen.

Beim Import können mögliche Gegenstücke über Aktenzeichen oder Namen vorgeschlagen werden. Die Entscheidung über neue Anlage oder Zusammenführung trifft die nutzende Person ausdrücklich.

## Nicht übernommen aus Gremia.BR

Gremia.SBV übernimmt nicht das BR-Rollenmodell mit BR-Vorsitz, BR-Ausschusslogik oder allgemeiner Gremienablage. technische Administration darf grundsätzlich keine Fallakteninhalte lesen.

## Art. 13/14 DSGVO

Die App informiert Beschäftigte nicht selbst. Die Information über Arbeitgeberliste, SBV-Verarbeitung und Personenverzeichnis muss organisatorisch erfolgen.

## Art. 15 DSGVO

Die App unterstützt Auskunftsfähigkeit, indem Personen, Fallakten, Fristen, Maßnahmen, Importläufe und Lifecycle-Events nachvollziehbar verknüpft sind. Im Compliance Center kann ein Art.-15-Antwortentwurf aus Personen-, Fallakten-, Fristen-, Maßnahmen-, Import- und Lifecycle-Daten vorbefüllt, erzeugt und als Markdown oder PDF exportiert werden. Vor Herausgabe bleiben Identitätsprüfung, Drittdatenprüfung, Schwärzung und rechtliche Freigabe erforderlich.
