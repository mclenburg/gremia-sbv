# AppImage: weißes Fenster beheben

## Ursache

Im Entwicklungsmodus lädt Electron den Renderer über Vite (`http://127.0.0.1:5173`).
Im AppImage wird dagegen `dist/index.html` über `file://` geladen.

Vite erzeugt ohne `base: './'` absolute Asset-Pfade wie:

```html
<script src="/assets/index-....js"></script>
```

Unter `file://` zeigt `/assets/...` aber auf das Dateisystem-Wurzelverzeichnis und nicht auf den AppImage-Inhalt. Ergebnis: Das Fenster bleibt weiß.

## Fix

`vite.config.ts` setzt jetzt:

```ts
base: './'
```

Damit werden relative Asset-Pfade erzeugt:

```html
<script src="./assets/index-....js"></script>
```

Zusätzlich schreibt `electron/main.ts` im Paketmodus jetzt in die Konsole:

- Datenverzeichnis
- Icon-Pfad
- geladene `index.html`
- Renderer-Console-Fehler
- Renderer-Load-Fehler
- Renderer-Crashs

## Debug-Start

```bash
GREMIA_SBV_OPEN_DEVTOOLS=1 ./release/Gremia.SBV-*.AppImage
```

Wenn das Fenster wieder weiß bleibt, sind die relevanten Fehler jetzt im Terminal sichtbar.
