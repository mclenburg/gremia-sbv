# Startschutz / Sicherheitsbrücke

Dieses Paket stabilisiert die Electron-Preload-Brücke zwischen Renderer und Hauptprozess.

## Symptome

Wenn die App meldet:

```text
Der Sicherheitsdienst ist nicht erreichbar. Bitte Anwendung neu starten.
```

oder

```text
Die interne Sicherheitsbrücke wurde nicht geladen.
```

war die Preload-Brücke nicht verfügbar oder der IPC-Handler konnte nicht angesprochen werden.

## Änderungen

- Der Preload-Pfad wird im Electron-Hauptprozess robust aufgelöst.
- Preload-Fehler werden im Terminal sichtbar protokolliert.
- Der Renderer wartet kurz auf die Brücke, bevor er die Sicherheitsabfrage startet.
- Die UI zeigt keine Entwicklernotizen, sondern eine knappe Startfehlermeldung.

## Prüfen

```bash
rm -rf dist dist-electron
npm run dev
```

Bei erneutem Fehler bitte die Terminalzeilen mit `preload error`, `security status failed` oder `renderer load failed` prüfen.
