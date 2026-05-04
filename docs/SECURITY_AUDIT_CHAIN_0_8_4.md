# Gremia.SBV 0.8.4 – Security Hardening und Audit Chain

## Ziel

0.8.4 härtet den Umgang mit Schlüsselmaterial und führt ein lokales, hashverkettetes Audit-Log für Zugriffe und Änderungen an personenbezogenen Daten ein.

## Memory-Sicherheit

Gremia.SBV kann bei entsperrter Nutzung keinen vollständigen Schutz gegen Memory-Dumps garantieren. Daten, die angezeigt oder bearbeitet werden, liegen im RAM von Electron/Chromium/Node im Klartext vor.

Neu umgesetzt:

- `safeDestroyBuffer(...)`
- aktives Überschreiben des Datenbankschlüssels beim Sperren, Reset und Fehlerfällen
- Überschreiben temporärer KDF-/AES-Buffer
- Akzeptanz alter KDF-Parameter für bestehende Tresore
- stärkere KDF-Parameter für neue Tresore und neue Passwort-Rewraps

## KDF

Bestehende Tresore bleiben kompatibel mit den bisherigen scrypt-Parametern.

Neue Stores und neue Key-Wraps verwenden:

```text
N=131072
r=8
p=1
maxmem=256 MB
```

## Audit Chain statt externer Blockchain

Eine externe Blockchain wäre für hochsensible SBV-Daten nicht angemessen: Sie würde unnötige Metadaten erzeugen, Offline-first brechen und neue Datenschutzrisiken schaffen.

Stattdessen wird lokal eine Hash-Kette umgesetzt:

```text
previous_hash -> aktueller Audit-Eintrag -> entry_hash
```

Damit werden nachträgliche Manipulationen erschwert und prüfbar.

## Auditierte Vorgänge

In 0.8.4 werden insbesondere protokolliert:

- Fallakten lesen/anlegen
- Fallnotizen lesen/anlegen/ändern/löschen
- Volltextsuche in Falldaten
- Falldokumente anzeigen/importieren/exportieren/löschen
- Kontakte lesen/anlegen/ändern/löschen

## Grenze

Das Audit-Log ist manipulationserschwerend, nicht manipulationsunmöglich. Wer vollständigen Dateizugriff auf den Tresor und den Schlüssel hat, kann grundsätzlich Daten verändern. Die Hash-Kette macht solche Eingriffe aber prüfbar.
