# Native SQLCipher-Abhängigkeit

Gremia.SBV nutzt für den produktiven Tresor `better-sqlite3-multiple-ciphers`.
Dieses Paket ist eine native Node-Abhängigkeit. Es muss lokal installiert und ggf. gegen die vorhandene Node-/Electron-Umgebung gebaut werden.

## Warum die App ohne dieses Modul nicht startet

Der geschützte Datenbestand darf nicht ersatzweise als normale SQLite-Datei geöffnet werden. Wenn das SQLCipher-fähige Datenbankmodul fehlt, bricht die Initialisierung deshalb bewusst ab.

Fehlerbild:

```text
Cannot find module 'better-sqlite3-multiple-ciphers'
```

Dann ist das Paket nicht installiert oder beim `npm install` übersprungen worden.

## Linux-Vorbereitung

Debian/Ubuntu/Linux Mint:

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++
```

Danach im Projektordner:

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

Falls das Modul zwar installiert ist, aber wegen nativer Binary-/ABI-Probleme nicht lädt:

```bash
npm run native:rebuild
rm -rf dist dist-electron
npm run dev
```

## Wichtig für die Sicherheitsarchitektur

`better-sqlite3-multiple-ciphers` ist jetzt eine normale Dependency, keine optionale Dependency mehr. Ein Fehlen des Moduls ist ein harter Fehler.

Das ist beabsichtigt: Eine kopierte Datenbankdatei darf in einer neuen Umgebung ohne passenden Schlüssel nicht lesbar werden. Die Datenbankverschlüsselung liegt deshalb in der Tresor-Datenbank selbst, nicht nur in einer UI-Sperre oder einer Begleitdatei.
