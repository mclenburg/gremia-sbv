# Die Implementierung – Testverträge und performante Drittlizenzen

## Korrektur der Testmigration

Vier von npm-Skripten referenzierte Tests werden nicht länger durch das Source-Cleanup entfernt. Sie wurden als ausführbare Verträge neu aufgebaut:

- Vorlagen anlegen, ändern, löschen sowie Schutz von Systemvorlagen,
- Vorlagen rendern, archivieren, offene Platzhalter und Fehlerpfade,
- frische und wiederholte BEM-Schemamigration,
- Release-Readiness ohne verwaiste Testskripte.

Die Tests importieren und führen Produktivcode aus. Positiv-, Negativ- und Idempotenzpfade werden geprüft.

## Drittlizenz-Erzeugung

Die Erzeugung verwendet nun drei Stufen:

1. Fingerprint-Schnellpfad für unveränderte Lockfile- und Ausgabe-Artefakte,
2. lokale Paketdaten aus dem durch `npm ci` erzeugten exakten Paketbaum,
3. paralleler Registry-/Tarball-Fallback nur für lokal nicht verfügbare Paketdaten.

Der Schnellpfad ist durch einen Verhaltenstest abgesichert und führt keinerlei Registry-Zugriff aus. Änderungen an Lockfile oder Lizenzartefakten invalidieren den Zustand automatisch.
