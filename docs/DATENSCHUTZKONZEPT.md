# Datenschutzkonzept Gremia.SBV

## Zweck der Verarbeitung

Gremia.SBV dient der vertraulichen Organisation der Aufgaben der Schwerbehindertenvertretung. Die Verarbeitung erfolgt zur Beratung, Begleitung, Interessenvertretung, Fristenkontrolle und Dokumentation im Rahmen der SBV-Tätigkeit.

## Datenkategorien

Mögliche Daten:

- Kontaktdaten betroffener Personen
- Schwerbehindertenstatus / Gleichstellung
- Grad der Behinderung
- Merkzeichen, soweit erforderlich
- Gesprächsnotizen
- BEM-Informationen
- Arbeitsplatzbezogene Belastungen
- Schriftverkehr
- Fristen
- Kontakte zu Inklusionsamt, Betriebsarzt, Beratungsstellen

Diagnosen sollen nicht als Standardfeld gespeichert werden. Wenn medizinische Unterlagen erforderlich sind, werden sie als besonders sensible Dokumente markiert.

## Rollen und Zugriff

Grundsatz:

```text
Nur die Vertrauensperson nutzt die aktive Fallakte.
```

Stellvertretungen erhalten nicht automatisch Zugriff auf alle Fälle. Eine spätere Zugriffslogik muss fallbezogen und dokumentiert erfolgen.

## Datensparsamkeit

Die Anwendung unterstützt drei Stufen:

1. anonymer Fall
2. pseudonymisierte Fallakte
3. personenbezogene Fallakte

Deanonymisierung wird protokolliert.

## Speicherbegrenzung und Löschung

Für jeden Fall soll ein Lösch-/Prüfdatum gesetzt werden können. Nach Abschluss eines Falls erscheint eine Wiedervorlage zur Prüfung, ob die Daten noch erforderlich sind.

## Exportkontrolle

Vor Exporten prüft die Anwendung perspektivisch:

- enthält der Export Namen?
- enthält der Export Gesundheitsdaten?
- ist der Export für Tätigkeitsbericht oder externe Weitergabe gedacht?
- wurde eine Warnung bestätigt?

## Tätigkeitsbericht

Tätigkeitsberichte dürfen keine personenbezogenen Daten enthalten. Statistiken werden aggregiert erzeugt.

## Gremia.BR-Schnittstelle

Eine spätere Schnittstelle zu Gremia.BR darf nur lesend sein. SBV-Falldaten dürfen nicht automatisch an Gremia.BR übertragen werden.
