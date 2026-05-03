# Gremia.SBV 0.4.36 – Deep-Link-Auswahl bleibt erhalten

## Problem
Nach Klick auf ein Präventionsverfahren sprang die Fallakte kurz korrekt auf die Maßnahme, wechselte danach aber sofort zurück auf die Übersicht.

## Ursache
Der Lade-Effekt der Fallakte hing zusätzlich an `pendingCaseNodeTarget`. Nachdem der Zielknoten verbraucht und auf `null` gesetzt wurde, lief der Effekt erneut und setzte `selection` auf `overview`.

## Änderung
Der Effekt lädt die Fallbestandteile wieder nur bei Wechsel der Fallakte (`selectedCaseId`). Dadurch wird der Deep-Link einmalig verarbeitet und nicht unmittelbar überschrieben.
