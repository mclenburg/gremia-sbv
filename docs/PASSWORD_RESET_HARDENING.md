# Passwort- und Recovery-Härtung ab 0.3.6

Gremia.SBV darf im Produktivbetrieb nicht durch Löschen der Datei `data/security.json` neu initialisiert werden, solange ein geschützter Datenbestand vorhanden ist.

## Schutzprinzip

Beim ersten Einrichten werden zwei Dateien erzeugt:

- `data/security.json` – Passwort-Prüfwert, kein Klartextpasswort
- `data/vault-manifest.json` – Tresor-Kennung und Recovery-Prüfwert

Zusätzlich wird geprüft, ob im Datenverzeichnis bereits geschützte Daten liegen, zum Beispiel SQLite-/SQLCipher-Dateien oder Dokumentenordner.

Fehlt `security.json`, aber es gibt ein Sicherheitsmanifest oder Datenbestand, wechselt die Anwendung in den Recovery-Modus. Ein neues Initialpasswort kann dann nicht einfach gesetzt werden.

## Zulässige Wege

### 1. Normale Passwortänderung

Einstellungen → Passwort ändern. Erforderlich ist das aktuelle Passwort.

### 2. Recovery mit Recovery-Key

Wenn das Passwort verloren geht oder `security.json` fehlt, kann mit dem Recovery-Key ein neues Passwort gesetzt werden. Der Recovery-Key wird nur einmal bei der Ersteinrichtung angezeigt.

### 3. Neuer leerer Datenbestand

Ohne Passwort und ohne Recovery-Key ist ein Zugriff auf den vorhandenen Datenbestand nicht vorgesehen. Dann kann nur der lokale Datenbestand bewusst verworfen werden. Dafür muss exakt eingegeben werden:

```text
DATENBESTAND LÖSCHEN
```

Dieser Vorgang löscht den lokalen Datenbestand im konfigurierten Datenverzeichnis und führt zurück zur Ersteinrichtung.

## Produktivhinweis

Die aktuelle Implementierung schützt den Startprozess und das Passwort-Reset-Verhalten. Die spätere SQLCipher-Anbindung muss den Datenbankschlüssel zusätzlich aus dem Passwort bzw. einem verschlüsselten Master-Key ableiten. Ein Passwort-Reset darf dann nur den Master-Key neu verpacken, nicht die Daten entschlüsselt offenlegen.


## Ergänzung ab 0.3.7: Datenbank als eigentliche Sicherheitsgrenze

Der Schutz liegt nicht nur in `security.json`. Die eigentliche Fall- und Fristendatenbank wird als SQLCipher-Tresor unter `data/gremia-sbv.vault.sqlite` angelegt. Ein Kopieren dieser Datenbankdatei in eine neue Umgebung reicht nicht aus, um die Daten zu öffnen. Ohne Passwort oder Recovery-Key kann der Datenbankschlüssel nicht entpackt werden.

Wird `security.json` gelöscht, aber Manifest oder Datenbank sind vorhanden, wechselt die App in den Recovery-Modus. Ein neues Initialpasswort ist dann nicht zulässig.
