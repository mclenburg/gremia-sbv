# Native SQLCipher Dependency unter Electron neu bauen

`better-sqlite3-multiple-ciphers` ist ein natives Node-Modul. Es muss gegen die Node-/V8-Version gebaut werden, die Electron intern verwendet.

Wenn die App meldet:

```text
was compiled against a different Node.js version using NODE_MODULE_VERSION ...
This version of Node.js requires NODE_MODULE_VERSION ...
```

wurde das Modul für das normale System-Node gebaut, nicht für Electron.

## Lösung

Im Projektordner:

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++

rm -rf node_modules package-lock.json
npm install
npm run native:rebuild:electron
rm -rf dist dist-electron
npm run dev
```

Alternativ:

```bash
./scripts/rebuild-sqlcipher-electron.sh
```

## Diagnose

```bash
npm run native:diagnose
```

Diese Diagnose prüft nur, ob das Modul im aktuellen Node-Prozess geladen werden kann. Für Electron ist trotzdem der Electron-Rebuild maßgeblich.

## Warum das nötig ist

Gremia.SBV verwendet SQLCipher als harte Schutzgrenze. Die Datenbankdatei soll auch dann unlesbar bleiben, wenn sie in eine neue Umgebung kopiert wird. Deshalb darf die App nicht still auf unverschlüsseltes SQLite zurückfallen.
