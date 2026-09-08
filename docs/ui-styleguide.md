# Gremia.SBV – UI- und CSS-Styleguide

Dieser Styleguide ist verbindlich für neue und geänderte Oberflächen. Ziel ist ein professionelles, barrierefreies Werkzeug aus einem Guss: fachliche Abläufe stehen vor visueller Vielfalt, zentrale Komponenten vor lokalen Sonderlösungen.

## Öffentliche Token-Schicht

Neue oder geänderte Komponenten verwenden ausschließlich die öffentliche `--industrial-*`-Token-Schicht. `--sbv-*` bleibt Rohwert-/Kompatibilitätsebene in `designTokens.css`; freie Aliase wie `--accent`, `--surface-*`, `--border-*` oder `--text-*` dürfen nicht in neuem Code eingeführt werden.

Keine neue Hex-Farbe außerhalb `src/app/ui/designTokens.css`. Halbtransparente Zustände entstehen über vorhandene Token oder `color-mix(in srgb, var(--industrial-*) …, transparent)`.

## Typografie und Abstand

Neue freie `font-size`-, `padding`-, `margin-` und `gap`-Einzelwerte sind zu vermeiden. Neue Regeln verwenden vorhandene Token oder die verbindliche Skala:

```css
--font-size-2xs: 0.68rem;
--font-size-xs: 0.74rem;
--font-size-sm: 0.82rem;
--font-size-base: 0.9rem;
--font-size-md: 1rem;
--font-size-lg: 1.15rem;
--font-size-xl: 1.4rem;

--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.5rem;
--space-6: 2rem;
```

Immer `rem`, nie neue `px`-Textgrößen. Das erhält Nutzer-Zoom und reduziert Sonderlayouts.

## Fokus, Barrierefreiheit und Interaktion

Der Fokusindikator ist ein Sicherheitsmerkmal der Bedienung. Neue lokale `:focus-visible`-Sonderregeln sind unzulässig, solange sie nicht eine konkrete technische Ausnahme für Tastatur- oder Hochkontrastbedienung lösen. Standard ist der zentrale Fokus über `--focus-ring`.

Jedes native Formularelement (`input`, `select`, `textarea`, `button`) muss über zentrale Klassen oder zentrale Komponenten gestaltet sein. Pflicht bleiben sichtbares Label, Fehlerbezug per `aria-describedby`, Live-Region bei Validierungsfehlern und ausreichender Kontrast in Dark und Light.

Hilfen gehören hinter den zentralen Hilfe-Button. Dauerhaft sichtbare Erklärungstexte sind nur fachlicher Inhalt, keine Bedienungsanleitung.

## Layout und Navigation

Neue Breakpoints dürfen nur aus dem bestehenden Breakpoint-Satz abgeleitet werden. Neue Auswahlfelder mit mehr als fünf möglichen Einträgen müssen filterbar sein. Eigenständige Neuanlagen stehen rechts in der Modul-Kopfzeile als Primary-Aktion; untergeordnete Neuanlagen bleiben im Kontext des Elternvorgangs.

Gleiche Funktionen stehen modulübergreifend an derselben Stelle und verwenden dieselben zentralen Komponenten. Icons, Hover-Effekte und Cursor-Zeiger sind interaktiven Elementen vorbehalten.

## Governance

`tests/architecture/uiStyleGovernance.test.ts` erzwingt den bereinigten Zielzustand:

- keine neuen Hex-Farben außerhalb `designTokens.css`,
- keine zusätzlichen lokalen `:focus-visible`-Vorkommen,
- keine wachsende Vielfalt bei `font-size` und `padding`,
- keine neuen undokumentierten Breakpoints,
- keine neuen nativen Formular-Controls ohne explizite Klasse,
- keine Inline-Styles.

Die Baseline liegt in `maintenance/architecture/ui-style-baseline.json` und steht für diese Kernverstöße auf `0`. Jeder neue Treffer ist ein Designbruch und muss vorab ausdrücklich freigegeben werden.
