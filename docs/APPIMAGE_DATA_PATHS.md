# AppImage-Datenpfade

Stand: **0.9.1**

## Grundsatz

AppImage ist nur das Programm-Artefakt. Fachdaten liegen im konfigurierten lokalen Datenverzeichnis und nicht im AppImage selbst.

## Datenpfad

Für Tests wird `GREMIA_SBV_DATA_DIR` auf eine isolierte temporäre Umgebung gesetzt. Produktive Pfade müssen vor Nutzung geklärt und gesichert werden.

## Datenschutz

Das Datenverzeichnis enthält Datenbank, Dokumente, Backups und gegebenenfalls Personenverzeichnis. Es ist wie eine vertrauliche SBV-Akte zu behandeln.
