# Testqualitätsmetrik

Das Release-Gate begrenzt den Anteil echter Quelltext-Stringtests auf maximal 10 Prozent aller Assertions.

## Was als Quelltext-Stringtest zählt

Eine Assertion zählt nur dann als Source-Text-Assertion, wenn ihr tatsächlicher Wert aus `readFileSync` oder `readNormalizedSourceText` stammt oder aus einer solchen Variable abgeleitet wurde und anschließend mit `toContain` oder `toMatch` geprüft wird.

Fachliche Stringprüfungen auf Laufzeitergebnissen – beispielsweise gerenderte Vorlagentexte, Fehlermeldungen, IDs oder Exportinhalte – sind Verhaltensassertions und werden nicht als Quelltexttests gezählt.

Die Erkennung erfolgt über den TypeScript-AST einschließlich einfacher Herkunftsverfolgung. Eine globale Regex-Zählung aller `toContain`- und `toMatch`-Aufrufe findet nicht mehr statt.

## Release-Gate

```text
sourceAssertions / assertions <= 0,10
```

Die Zahl reiner Source-Inspection-Dateien und hybrider Dateien wird weiterhin transparent ausgewiesen. Die Dateiquote ist jedoch nicht das Freigabekriterium.

Statische Tests bleiben für Artefaktverträge sinnvoll, etwa CSP, Packaging, Workflows oder Buildkonfiguration. Fachliche Funktionalität muss durch ausführbare Positiv-, Negativ- und Integrationsfälle abgesichert werden.
