# Mitentwickeln an Gremia.SBV

Gremia.SBV ist Fachsoftware für besonders sensible Arbeit. Beiträge sind willkommen, wenn sie diese Linie stärken: **vertraulich, lokal, barrierearm, testbar und fachlich sauber.**

## Was gute Beiträge ausmacht

- Sie lösen ein echtes SBV-Problem.
- Sie respektieren Offline-first und Datenschutz.
- Sie halten Architekturgrenzen ein.
- Sie bringen Verhaltenstests mit.
- Sie verschlechtern Barrierefreiheit nicht.
- Sie vermeiden neue Abhängigkeiten, solange sie nicht gut begründet sind.

## Architekturregeln

- Der Renderer spricht nicht direkt mit Datenbank, Dateisystem oder externen Diensten.
- Externe Kommunikation läuft nur über explizite, fachliche Services und Policies.
- Es gibt keine generische HTTP-Bridge.
- Secrets, Tokens und Passwörter gehören nicht in localStorage, Logs oder Renderer-State.
- Datenschutzrelevante Daten müssen bei Anonymisierung, Löschung, Retention und Suchindex berücksichtigt werden.

## Tests

Neue Funktionen brauchen Verhaltenstests. Reine Source-String-Tests sind nur letzte Wahl und müssen gut begründet sein.

Bevor ein Patch fertig ist, sollten mindestens laufen:

```bash
npm run test
npm run build:readiness:strict
```

Für UI-relevante Änderungen zusätzlich:

```bash
npm run test:e2e
```

Tests müssen plattformunabhängig sein:

- keine festen `/tmp`-Pfade,
- keine Shell-Annahmen,
- keine OS-spezifischen Pfadseparatoren,
- keine echten Netzwerkdienste, wenn ein Fake reicht,
- keine echten OCR-/Office-/PDF-Prozesse in Unit-Tests.

## Barrierefreiheit

Sichtbare Statusänderungen brauchen Screen-Reader-Rückmeldung, insbesondere bei Speichern, Löschen, Import, Suche, Verbindungstest und Fehlern. Dialoge müssen per Tastatur bedienbar sein.

## Pull-Request-Checkliste

- [ ] Fachlicher Nutzen ist klar.
- [ ] Datenschutzpfade sind geprüft.
- [ ] Tests sind Verhaltenstests, keine bloßen Stringtests.
- [ ] E2E ist ergänzt, wenn ein kritischer Nutzerfluss betroffen ist.
- [ ] Announcer/Live-Regionen sind bei Statusänderungen genutzt.
- [ ] Keine Secrets in UI, Logs oder Testsnapshots.
- [ ] Dokumentation ist aktualisiert, wenn sich Bedienung, Architektur oder Datenschutz ändern.
