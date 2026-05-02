# Theme-System

Gremia.SBV unterstützt ab Version 0.3.13 zwei Darstellungen:

- **Dark Industrial** – Standardmodus, grau/schwarz mit gelben Akzenten.
- **Light Industrial** – helle Arbeitsfläche, weiterhin kantig, technisch und kontrastreich.

Der Wechsel erfolgt in der App unter:

```text
Einstellungen → Darstellung
```

Die Auswahl wird lokal im Renderer über `localStorage` unter `gremia.sbv.theme` gespeichert. Das ist bewusst keine sicherheitsrelevante Einstellung und wird nicht in den verschlüsselten Tresor gelegt.

## Designregel

Light-Mode bedeutet nicht „weiches Bürodesign“. Beide Themes nutzen dieselben Industrial-Komponenten, dieselbe kantige Formsprache, dieselben Warnfarben und dieselbe kompakte Informationsdichte.

## Technische Umsetzung

Das aktive Theme wird am `html`-Element gesetzt:

```html
<html data-theme="dark">
<html data-theme="light">
```

Die Farben werden über CSS-Variablen in `src/styles/globals.css` gesteuert. Neue Komponenten sollen daher vorrangig die bestehenden Klassen verwenden:

- `industrial-panel`
- `industrial-card`
- `industrial-form`
- `industrial-button`
- `industrial-table`
- `industrial-status-badge`

Direkte Tailwind-Farbklassen sollen in neuen Fachmodulen vermieden werden, damit beide Themes sauber greifen.


## 0.3.14 Light-Mode-Kontrastpass

Der Light-Mode nutzt weiterhin die Industrial-Formsprache, aber die Sekundärtexte wurden deutlich abgedunkelt. Besonders betroffen waren Sidebar, Modultexte, Tabellen-Metadaten, Status-Badges, Formularlabels und Hinweise.

Regel: Sekundärtext darf im Light-Mode zurücktreten, aber nie unter Arbeitskontrast fallen. Harte Lesbarkeit geht vor subtiler Optik.
