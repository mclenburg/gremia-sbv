# Inline-Fristen aus Protokollen

Ab Version 0.3.19 kann in Gesprächsnotizen und Protokollen direkt eine Frist erzeugt werden.

## Bedienung

In den Feldern **Inhalt** oder **Nächste Schritte** genügt die Eingabe von:

```text
//
```

Danach öffnet Gremia.SBV innerhalb des Notizformulars einen Fristdialog.

Die Frist wird immer mit dem aktuell ausgewählten Fall verbunden. Das ist bewusst so: Fristen aus Gesprächsnotizen sind keine freien Kalendertermine, sondern entstehen aus einem konkreten Vorgang.

## Angelegte Frist

Die Inline-Frist wird angelegt als:

- `processType = case`
- `deadlineType = follow_up`
- `caseId = aktueller Fall`
- `sourceEvent = Protokoll / Gesprächsnotiz`
- `confidentialTitle = Frist <Aktenzeichen>`

Dadurch erscheint sie in der Fristenliste und – spätestens 48 Stunden vor Ablauf – auf dem Dashboard.

## Datenschutz

Der Dashboard-sichere Titel enthält nur das Aktenzeichen. Details bleiben im geschützten Fristdatensatz.

## Warum nicht automatisch aus Text parsen?

Gremia.SBV legt keine Fristen automatisch aus Freitext an. Die SBV entscheidet bewusst, ob ein Gesprächspunkt eine Frist wird. `//` ist deshalb ein manueller, kontrollierter Auslöser.

## Direkte Frist aus der Fallakte

Zusätzlich gibt es in der Fallakte die Aktion **Frist zum Fall**. Diese öffnet denselben Fristdialog ohne Slash-Befehl und verbindet die Frist ebenfalls unmittelbar mit dem aktuell ausgewählten Fall.
