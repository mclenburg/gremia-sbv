# Frontend-Ladegrenzen und Barrierefreiheit

## Synchroner Kern

Sicherheitsoberfläche, Dashboard, Fälle und Fristen bleiben synchron im Hauptchunk. Diese Bereiche müssen unmittelbar nach dem Entsperren beziehungsweise während der täglichen Kernarbeit verfügbar sein.

## Lazy geladene Bereiche

Die folgenden seltener genutzten Bereiche werden über `src/app/core/loading/lazyFeatureViews.tsx` dynamisch geladen:

- Wissen
- Vorlagen
- Berichte und Auswertungen
- Compliance-Center
- Einstellungen

Navigation per Maus oder Tastatur stößt das Vorladen an. Ein fehlgeschlagenes Vorladen blockiert die Navigation nicht; der eigentliche Aufruf bleibt durch die Ladefehlergrenze geschützt.

## Zugänglicher Ladevertrag

- Der Ladezustand besitzt `aria-busy="true"` und eine höfliche Live-Region.
- Die Hauptnavigation bleibt während des Ladens bedienbar.
- Ladefehler werden sichtbar und mit `role="alert"` angekündigt.
- Die Fehlerüberschrift erhält bei einem Ladefehler den Fokus.
- Ein expliziter Wiederholungsbutton steht bereit.
- Erfolgreiches Laden wird über die zentrale Live-Region angekündigt, ohne den Tastaturfokus ungefragt zu verschieben.
- Die Ladeanimation wird bei `prefers-reduced-motion: reduce` abgeschaltet.
- Für `forced-colors` existiert eine eigene Darstellung.

## Bundle-Gate

Vite erzeugt ein Manifest. `scripts/check-renderer-bundle.cjs` prüft nach jedem Renderer-Build:

- maximalen Hauptchunk,
- maximalen Anteil des Hauptchunks am gesamten JavaScript,
- Mindestzahl dynamischer Chunks,
- das Vorhandensein aller vereinbarten Lazy-Feature-Quellen.

Die Grenzwerte liegen in `maintenance/bundle/renderer-bundle-contract.json` und dürfen nur nach dokumentierter Messung geändert werden.

## Source-Assertions

Alle aktuell gezählten Source-Text-Assertions sind in `maintenance/test-quality/source-assertion-classification.json` klassifiziert:

- **A:** Das Artefakt selbst ist der Vertrag.
- **B:** Statische Architekturregel.
- **C:** Durch Verhaltenstest zu ersetzen.

Das Gate verweigert fehlende, verwaiste oder veraltete Einträge sowie jede noch offene Kategorie C. Die harte Gesamtgrenze von zehn Prozent bleibt zusätzlich bestehen.
