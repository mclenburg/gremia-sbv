# Report-PDF Electron Build Fix

Version 0.3.34 ersetzt die nicht mehr typisierte Option `marginsType` in `webContents.printToPDF()` durch die aktuelle `margin`-Option.

Damit läuft der TypeScript-Build mit der verwendeten Electron-Version wieder durch.
