# Native Menüleiste

Ab Version 0.4.16 blendet Gremia.SBV die native Electron-Menüleiste standardmäßig aus.

Grund:

- Die Menüleiste wirkt in der Industrial-Oberfläche wie ein Fremdkörper.
- Die App soll primär über die eigene Navigation, Modals und Tastaturkürzel bedient werden.
- Unter Windows/Linux soll kein generisches Electron-Menü sichtbar bleiben.

Technisch wird beim Start gesetzt:

```ts
Menu.setApplicationMenu(null);
win.setMenuBarVisibility(false);
win.setAutoHideMenuBar(true);
```

Für Debugging kann die Menüleiste ausnahmsweise aktiviert werden:

```bash
GREMIA_SBV_SHOW_MENU=1 npm run dev
```

Für produktive Builds bleibt sie standardmäßig ausgeblendet.
