# Gremia.SBV 0.4.22 – Fallseitenkopf und Toast-Sichtbarkeit

## Änderungen
- Fallseite nutzt den `ModuleFrame` im kompakten Modus.
- Der große zweite Titel auf der Fallakte entfällt.
- Sichtbar bleibt nur der kleine Arbeitsbereich-Hinweis.
- Toast-Rückmeldungen werden mit `position: fixed !important` und sehr hohem `z-index` im sichtbaren Viewport angezeigt.
- Toasts nutzen `aria-live="assertive"`.

## Zweck
Mehr Platz für die Fallbearbeitung und verlässliche Rückmeldung direkt im sichtbaren Bildbereich.
