# Gremia.SBV 0.6.1a – Neues-Fall-Modal Layout-Fix

## Problem

0.6.1 hatte das Neue-Fall-Modal mit horizontalem Scroll versehen. Das war falsch: Das Modal soll nicht seitlich scrollbar sein, sondern die Felder sauber umbrechen.

## Änderung

- `case-create-modal-scroll` wurde durch `case-create-modal-responsive` ersetzt.
- Horizontaler Scroll wurde entfernt.
- Die Formularfelder umbrechen per responsive Grid.
- Buttons umbrechen bei kleinen Breiten.
- Felder verwenden `min-width: 0`, damit sie nicht aus dem Modal herausdrücken.

## Zielbild

Das Modal bleibt vollständig sichtbar. Die Felder laufen nicht nach rechts aus dem sichtbaren Bereich und erzeugen keinen horizontalen Scrollbalken.
