# Gremia.SBV 0.4.56 – Verhaltenstests für Inline-Befehle

## Ziel

Nach den Refaktorierungen bis 0.4.55 werden die Inline-Kürzel fachlich abgesichert.

## Neu

```text
tests/inlineCommandBehavior0456.test.ts
```

## Abgesichert

- Erkennung aller unterstützten Kürzel:
  - `//`
  - `@@`
  - `##`
  - `§§`
  - `!!`
  - `>>`
  - `^^`
  - `~~`
- früheste Treffererkennung bei mehreren Kürzeln im Text
- Marker-Ersetzung ohne Verlust des übrigen Textes
- Marker-Entfernung ohne Verlust des übrigen Textes
- Formatierung von Fallbezügen
- Formatierung von Rechtsnormen
- Formatierung von Risiko, Aufgabe, Vertraulichkeit und Anonymisierung
- strukturelle Verdrahtung aller acht Aktionen in `useInlineCommands`

## Warum jetzt?

Die Inline-Befehle sind arbeitspraktisch zentral. Nach dem Herauslösen in `useInlineCommands` reicht ein reiner Strukturtest nicht mehr aus. 0.4.56 schützt deshalb die Kernlogik gegen Rückfälle.
