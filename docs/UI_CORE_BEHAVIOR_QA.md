# UI-Core-Verhaltenstests

Diese E2E-Tests prüfen echte Bedienflüsse. Sie sollen nicht feststellen, ob ein bestimmter Text zufällig in einer Datei steht, sondern ob zentrale UI-Bausteine im laufenden Renderer korrekt reagieren.

## Geprüfte Verträge

- Dialoge setzen den Fokus sinnvoll, halten Tab innerhalb des Modals und geben den Fokus nach `Esc` an den Auslöser zurück.
- Pflichtfeldfehler erscheinen nicht beim bloßen Öffnen einer Maske, sondern erst nach Nutzerinteraktion oder Submit-Versuch.
- Große Textareas behalten die Inline-Kurzbefehle und Overlay-Ersetzungen.
- Asynchrone SBV-Ressourcenaktionen melden Erfolg und Fehler über Live-Regionen für Screenreader.
- Exportflüsse liefern eine Rückmeldung und bleiben datensparsam.

## Ausführung

```bash
npm run test:e2e:core-ui-flows
```

Für die Qualitätsprüfung steht zusätzlich zur Verfügung:

```bash
npm run release:check:core-ui
```

## Review-Regel

Neue zentrale UI-Komponenten gelten erst dann als bereit, wenn neben Architektur-Gates mindestens ein realer Bedienfluss abgesichert ist. Architekturtests dürfen Abweichungen verhindern; sie ersetzen aber keine Nutzerfluss- und A11y-Verhaltenstests.
