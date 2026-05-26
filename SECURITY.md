# Security Policy

Gremia.SBV verarbeitet besonders sensible SBV-Falldaten lokal und verschlüsselt. Sicherheitslücken werden deshalb vertraulich behandelt.

## Unterstützte Versionen

Sicherheitsmeldungen werden für den aktuellen 1.0-Release-Zweig und den jeweils neuesten Vorab-Release geprüft.

## Sicherheitslücken melden

Bitte veröffentliche Sicherheitslücken nicht als öffentliches Issue und füge keine Echtdaten, Screenshots mit personenbezogenen Daten oder produktive Datenbanken an.

Bevorzugter Meldeweg nach Veröffentlichung des Repositories:

1. GitHub Security Advisory im Repository öffnen, oder
2. falls noch nicht verfügbar: eine private Kontaktadresse der Projektbetreuung nutzen, sobald sie in den Release-Informationen benannt ist.

Eine gute Meldung enthält:

- betroffene Version,
- Betriebssystem,
- reproduzierbare Schritte,
- erwartetes und tatsächliches Verhalten,
- mögliche Auswirkungen auf Vertraulichkeit, Integrität oder Verfügbarkeit,
- keine personenbezogenen Echtdaten.

## Grundregeln für Beiträge

- Keine Secrets, Tokens oder produktiven Daten in Issues, Pull Requests, Tests oder Logs.
- Keine personenbezogenen Daten in Demo-/Testfixtures.
- Audit-Ereignisse dürfen keine Direktidentifikatoren oder Freitextinhalte enthalten.
- Neue Datenflüsse müssen offline-first und explizit ausgelöst bleiben.
