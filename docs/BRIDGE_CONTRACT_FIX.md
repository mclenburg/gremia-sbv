# Bridge-Vertrag für Wissensdatenbank

Version 0.4.7 repariert den Preload-/TypeScript-Vertrag der Wissensdatenbank.

Problem: Das Renderer-Modul nutzte `bridge.knowledge`, aber `src/vite-env.d.ts`, `electron/preload.ts` und `electron/main.ts` waren durch den Vorlagen-Patch nicht mehr konsistent. Dadurch schlug der Produktiv-Build fehl.

Fix:

- `window.gremiaSbv.knowledge` ist wieder im Renderer-Typ enthalten.
- `electron/preload.ts` stellt die Knowledge-IPC-Methoden wieder bereit.
- `electron/main.ts` registriert `registerKnowledgeIpc`.
- Ein Test prüft, dass Bridge-Typ, Preload und Main-Prozess die Wissensdatenbank gemeinsam kennen.
