# Layout- und Startschutz-Paket 0.3.3

Dieses Paket setzt den ersten UI-Schnitt für Gremia.SBV um.

## Enthalten

- abgespecktes Dashboard ohne erklärende Marketingtexte
- Industrial-Look: grau/schwarz, gelbe Akzente, kompaktere Karten, kantiger Stil
- Passwort-Gate vor dem Dashboard
- Sperren-Button in der Sidebar
- klickbare Modul-Kacheln
- Sidebar-Navigation
- erste UI-Masken für:
  - Fall anlegen
  - Frist anlegen
- Platzhalter-Container für die weiteren Module
- DevTools öffnen sich nur noch mit `GREMIA_SBV_OPEN_DEVTOOLS=1`

## Hinweis zum Passwortschutz

Der Startschutz ist bewusst schon vor das Dashboard gesetzt. Die echte SQLCipher-Schlüsselableitung folgt im Sicherheitsmodul. Bis dahin gilt:

- Passwort muss mindestens 12 Zeichen haben
- Dashboard ist ohne Eingabe nicht sichtbar
- der Electron-Bridge-Aufruf `security.unlock()` wird verwendet, wenn verfügbar
- im reinen Renderer-Entwicklungsmodus bleibt die Maske testbar

## Start

```bash
rm -rf dist dist-electron
npm run dev
```

DevTools bei Bedarf:

```bash
GREMIA_SBV_OPEN_DEVTOOLS=1 npm run dev
```
