# Fristenanzeige: Fallbezug als Aktenzeichen

Version: 0.3.21

Technische Fall-IDs werden in der Oberfläche nicht mehr angezeigt.

## Regel

- In Fristenlisten und Dashboard-Karten wird der Fallbezug über das fachliche Aktenzeichen dargestellt.
- Die technische `caseId` bleibt nur interne Datenbank-/Relationsinformation.
- Freie Wiedervorlagen ohne Fallbezug werden als `Freie Wiedervorlage` angezeigt.
- Fristen mit nicht auflösbarem Fallbezug werden als `Fallzuordnung nicht auflösbar` beziehungsweise `nicht auflösbar` markiert.

## Hintergrund

Die SBV arbeitet fachlich mit Aktenzeichen, nicht mit technischen UUIDs. UUIDs dürfen in der Produktoberfläche nicht als Arbeitsreferenz sichtbar sein.
