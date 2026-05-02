# Datenbankschutz / SQLCipher

Gremia.SBV schützt den Datenbestand nicht nur über eine UI-Sperre. Der produktive Datenbestand liegt in einer SQLCipher-verschlüsselten Datenbank:

```text
data/gremia-sbv.vault.sqlite
```

## Sicherheitsprinzip

Beim ersten Einrichten wird ein zufälliger 256-Bit-Datenbankschlüssel erzeugt. Dieser Schlüssel verschlüsselt die SQLCipher-Datenbank. Das Nutzerpasswort wird nicht als Datenbankschlüssel gespeichert und auch nicht direkt als Datenbankschlüssel verwendet.

Stattdessen gilt:

```text
Passwort
  -> scrypt-Key-Derivation
  -> Schlüssel zum Entpacken des Datenbankschlüssels
  -> SQLCipher öffnet die Datenbank
```

Für den Recovery-Key gilt dasselbe Prinzip. Der Recovery-Key ist kein Klartextpasswort, sondern kann den Datenbankschlüssel neu verpacken, damit ein neues Passwort gesetzt werden kann.

## Warum Kopieren der DB-Datei nicht reicht

Wer nur diese Datei kopiert:

```text
data/gremia-sbv.vault.sqlite
```

kann sie in einer neuen Umgebung nicht öffnen. Es fehlt der Datenbankschlüssel. Auch das Löschen von `security.json` erzeugt keinen neuen Zugriff, sondern führt in den Recovery-Modus.

## Wichtige Dateien

```text
data/gremia-sbv.vault.sqlite   # verschlüsselte SQLCipher-Datenbank
data/security.json             # Passwortprüfwert + verschlüsselter Datenbankschlüssel
data/vault-manifest.json       # Tresor-Metadaten + Recovery-Verpackung des Datenbankschlüssels
```

`security.json` und `vault-manifest.json` enthalten keinen unverschlüsselten Datenbankschlüssel.

## Passwortänderung

Beim Passwortwechsel wird die Datenbank nicht neu verschlüsselt. Stattdessen wird der zufällige Datenbankschlüssel mit dem neuen Passwort neu verpackt. Dadurch bleibt ein Passwortwechsel schnell und risikoarm.

## Recovery

Wenn `security.json` fehlt, aber Manifest oder Datenbank vorhanden sind, erlaubt Gremia.SBV kein neues Initialpasswort. Stattdessen ist nur möglich:

1. Recovery-Key eingeben und neues Passwort setzen.
2. Oder bewusst den gesamten Datenbestand löschen.

## Entwicklungsdatenbanken

Ältere Dateien wie `data/gremia-sbv.dev.sqlite` waren reine Entwicklungsartefakte. Produktiv ist ausschließlich `gremia-sbv.vault.sqlite` relevant.
