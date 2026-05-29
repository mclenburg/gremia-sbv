# Security Policy

Gremia.SBV verarbeitet besonders sensible SBV-Falldaten lokal und verschlüsselt. Sicherheitslücken werden deshalb vertraulich behandelt.

## Geltungsbereich

Sicherheitsmeldungen werden für den aktuellen öffentlichen Projektstand geprüft.

## Sicherheitslücken melden

Bitte veröffentliche Sicherheitslücken nicht als öffentliches Issue und füge keine Echtdaten, Screenshots mit personenbezogenen Daten oder produktive Datenbanken an.

Bevorzugter Meldeweg nach Veröffentlichung des Repositories:

1. GitHub Security Advisory im Repository öffnen, oder
2. eine vertrauliche Kontaktadresse der Projektbetreuung nutzen, soweit diese in den Projektinformationen benannt ist.

Eine gute Meldung enthält:

- betroffener Build oder Commit,
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
