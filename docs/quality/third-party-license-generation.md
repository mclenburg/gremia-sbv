# Drittlizenz-Erzeugung

## Ziel

Die Drittlizenz-Artefakte müssen reproduzierbar zum tatsächlich installierten Abhängigkeitsbaum passen, ohne unveränderte Builds durch unnötige Registry-Zugriffe auszubremsen.

## Erzeugungsstrategie

Die Erzeugung verwendet drei Stufen:

1. Fingerprint-Schnellpfad für unveränderte Lockfile- und Ausgabe-Artefakte,
2. lokale Paketdaten aus dem durch `npm ci` erzeugten exakten Paketbaum,
3. paralleler Registry-/Tarball-Fallback nur für lokal nicht verfügbare Paketdaten.

Der Schnellpfad führt keine Registry-Zugriffe aus. Änderungen am Lockfile oder an den Lizenzartefakten invalidieren den Zustand automatisch.

## Verbindliche Gates

```bash
npm run licenses:generate
npm run licenses:check
```

`licenses:generate` erzeugt beziehungsweise aktualisiert das Inventar. `licenses:check` prüft Inventar, Lizenztexte und Notices gegen den aktuellen Projektzustand. Öffentliche Build- und Releasepfade dürfen die Lizenzprüfung nicht umgehen.

Für kontrollierte Testumgebungen kann die Registry über `NPM_REGISTRY_URL` vorgegeben werden. Maßgeblich bleibt die konkrete Paketversion aus dem Lockfile; `latest` ist kein zulässiger Ersatz für die tatsächlich verwendete Version.
