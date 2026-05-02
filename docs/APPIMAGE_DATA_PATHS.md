# AppImage: Datenpfade und weißes Fenster

Ab Version 0.3.26 nutzt Gremia.SBV im gepackten Betrieb nicht mehr das aktuelle Arbeitsverzeichnis als Datenordner.

## Datenbankpfad

Im Entwicklungsmodus:

```text
<projekt>/data/gremia-sbv.vault.sqlite
<projekt>/data/security.json
<projekt>/data/vault-manifest.json
<projekt>/data/documents/
```

Im gepackten Linux-AppImage:

```text
~/.config/Gremia.SBV/data/gremia-sbv.vault.sqlite
~/.config/Gremia.SBV/data/security.json
~/.config/Gremia.SBV/data/vault-manifest.json
~/.config/Gremia.SBV/data/documents/
```

Der genaue Ordner wird beim Start im Terminal ausgegeben:

```text
Gremia.SBV data directory: ...
```

## Portabler Modus

Für USB-Stick/portable Tests kann der Datenordner bewusst gesetzt werden:

```bash
GREMIA_SBV_DATA_DIR="/pfad/zum/stick/Gremia.SBV-data" ./Gremia.SBV-*.AppImage
```

Dann liegen Sicherheitsmanifest, SQLCipher-Tresor und verschlüsselte Dokumente in genau diesem Ordner.

## Warum das wichtig ist

Eine produktive App darf nicht davon abhängen, aus welchem Terminalordner sie gestartet wird. Das AppImage nutzt daher standardmäßig den Electron-UserData-Pfad und nicht `process.cwd()`.

## Weißes Fenster

Ein weißes Fenster im AppImage entsteht häufig, wenn der gepackte Renderer oder das Datenbankschema nicht geladen werden kann. Ab 0.3.26 wird `database/schema.sql` in den Build aufgenommen und im gepackten Betrieb aus `process.resourcesPath` aufgelöst.

Zum Debuggen:

```bash
./release/Gremia.SBV-*.AppImage
```

Terminalausgaben mit `renderer load failed`, `preload error`, `Datenbankschema nicht gefunden` oder `data directory` sind dafür entscheidend.
