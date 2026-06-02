# UI Visual QA für Gremia.SBV

Gremia.SBV nutzt eine harte Industrial-UI mit zentralen Komponenten. Das visuelle QA-Gate verhindert, dass Light-Mode, Dark-Mode und zentrale Bausteine auseinanderlaufen.

## Ziel

Das Gate prüft keine Pixel-Snapshots. Es prüft Verhalten und sichtbare Designverträge:

- alle primären Arbeitsbereiche öffnen in Light- und Dark-Mode,
- große zentrale Flächen fallen im Light-Mode nicht auf dunkle Altfarben zurück,
- große zentrale Flächen werden im Dark-Mode nicht versehentlich hell,
- Badges und Chips werden nicht wieder zu überrundeten Pill-Badges,
- zentrale Controls behalten im Light-Mode das Industrial-Chrome,
- der Kurzbefehle-Dialog bleibt in beiden Themes visuell integriert.

## Ausführung

```bash
npm run test:e2e:visual
```

Vor der ersten Ausführung müssen die optionalen Playwright-Abhängigkeiten installiert sein:

```bash
npm run test:e2e:setup
```

Das reguläre `npm run test:e2e` enthält die visuelle Spezifikation ebenfalls, weil sie unter `e2e/` liegt.

## Route-Matrix

Die Route-Matrix liegt zentral in `src/app/shared/theme/visualQa.ts`. Neue produktive Arbeitsbereiche müssen dort ergänzt werden, sobald sie in der Hauptnavigation sichtbar sind.

## Review-Regel

Eine UI-Korrektur ist nicht ausreichend, wenn sie nur einzelne Screenshots korrigiert. Die Korrektur muss entweder über zentrale Komponenten, zentrale CSS-Token oder ein Verhalten im Visual-QA-Gate abgesichert sein.

## Statischer Control-Sweep

Ergänzend zum visuellen E2E-Gate gibt es einen statischen Sweep gegen ungestylte native Formularfelder:

```bash
npm run ui:control-sweep
```

Der Sweep prüft, dass zentrale Selektoren für `input`, `select` und `textarea` in Industrial-Formularen, Modals, Settings-Formularen und Inline-Formularen vorhanden sind. Er meldet Feature-Dateien, in denen native Controls ohne erkennbaren zentralen Industrial-Kontext auftauchen. Ziel ist, Browser-Default-Optik vor der manuellen Abnahme zu finden, bevor sie im Screenshot sichtbar wird.
