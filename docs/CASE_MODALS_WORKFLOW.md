# Fallakten-Workflow: Fallbaum und Modals

Gremia.SBV 0.4.11 verschiebt die unmittelbaren Erfassungsmasken aus der Fallaktenseite in fokussierte Overlay-Modals.

## Leitlinie

Die Fallakte bleibt Hauptarbeitsbereich. Der Fallbaum ist der Einstiegspunkt für Notizen, Protokolle, Dokumente, Fristen und Maßnahmen.

## Änderungen

- Neue Fallakten werden über einen kleinen Button oben rechts an der Fallliste angelegt.
- Die Eingabemaske öffnet als Modal.
- Notizen und Gesprächsprotokolle werden aus dem Fallbaum bzw. der Fallaktionenleiste heraus angelegt.
- Die Notiz-/Protokollmaske öffnet als Modal.
- Inline-Kommandos wie `//`, `@@`, `##`, `§§`, `!!`, `>>`, `^^` und `~~` bleiben innerhalb des Notizmodals nutzbar.
- Nach dem Speichern wird das Modal geschlossen und der erzeugte Eintrag im Fallbaum ausgewählt.

## UX-Grundsatz

Keine dauerhaften Formularflächen unterhalb der Fallakte. Formulare erscheinen nur dann, wenn eine konkrete Aktion ausgelöst wurde.
