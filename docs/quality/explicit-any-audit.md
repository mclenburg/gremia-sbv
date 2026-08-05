# Explizites TypeScript-`any`: Audit und Ratchet

## Zweck

Das Projekt enthält historischen TypeScript-Code mit explizitem `any`. Patch M beseitigt diesen Bestand noch nicht mechanisch. Er macht ihn vollständig, reproduzierbar und einzeln adressierbar und verhindert ab sofort jede unbemerkte Erweiterung.

Die Prüfung basiert auf dem TypeScript-AST. Eine Wortsuche wäre ungeeignet, weil sie Kommentare und Zeichenketten mitzählen und zugleich syntaktische Rollen nicht zuverlässig unterscheiden würde.

## Befehle

```bash
npm run type-safety:any-report
npm run type-safety:any-report:json
npm run type-safety:any-check
```

Der Bericht nennt:

- Zahl gescannter TypeScript-Dateien,
- Gesamtzahl der Fundstellen,
- betroffene Dateien,
- Verteilung nach Projektbereich,
- Verteilung nach syntaktischer Rolle,
- neue und aus der Baseline verschwundene Fundstellen.

## Erfasster Umfang

Erfasst wird jedes `AnyKeyword` in nicht generierten Dateien mit den Endungen `.ts`, `.tsx`, `.mts` und `.cts`. Ausgenommen sind:

- `node_modules`,
- Build- und Release-Ausgaben,
- Coverage- und Playwright-Ausgaben,
- `.d.ts`-Deklarationsdateien.

Damit werden unter anderem erkannt:

```ts
value: any
Promise<any>
Record<string, any>
prepare<any>()
any[]
Array<any>
value as any
(...args: any[]) => any
```

Das Wort `any` in Kommentaren oder Zeichenketten ist keine Fundstelle.

## Stabile Identität einer Fundstelle

Jede Fundstelle erhält eine SHA-256-basierte Identität aus:

1. relativem Dateipfad,
2. syntaktischer Rolle,
3. nächstem benannten Symbol,
4. normalisiertem AST-Kontext,
5. Auftretensordinal bei identischen Kontexten.

Die Zeilennummer ist ausdrücklich kein Bestandteil der Identität. Reine Zeilenverschiebungen erzeugen daher keine scheinbar neue Schuld.

## Baseline und Ratchet

Die versionierte Baseline liegt unter:

```text
maintenance/type-safety/explicit-any-baseline.json
```

`type-safety:any-check` verlangt exakte Übereinstimmung:

- Eine neue Fundstelle lässt den Check fehlschlagen.
- Eine entfernte Fundstelle lässt den Check ebenfalls fehlschlagen, bis die Baseline im selben Patch abgesenkt wurde.
- Gleichzeitiges Entfernen und Hinzufügen bleibt sichtbar; ein unveränderter Gesamtsaldo genügt nicht.

Die Baseline ist kein Freibrief und keine Zielzahl. Jeder nachfolgende Type-Safety-Patch muss die tatsächlich entfernten Einträge aus ihr löschen. Sie darf niemals zur Aufnahme neuer Fundstellen erweitert werden, außer eine explizit begründete Architekturentscheidung wird separat reviewed.

## Verhältnis zu ESLint

Seit Patch N6 ist der Altbestand vollständig bereinigt. `@typescript-eslint/no-explicit-any` steht auf `error`; zusätzlich bleibt die leere AST-Baseline als unabhängiges Null-Ratchet bestehen. Neue Fundstellen werden damit sowohl durch ESLint als auch durch den vollständigen TypeScript-AST-Audit blockiert.

## Grenzen

Der Audit bewertet nicht, ob ein bestehendes `any` fachlich besonders riskant ist. Die Priorisierung erfolgt in den Folgepatches nach Grenze und Risiko:

1. Renderer und gemeinsame Modelle,
2. Electron und IPC,
3. kleine und mittlere Services,
4. Fachaggregate,
5. Report-, Migrations- und Security-Monolithen.

`unknown` ist kein automatischer Ersatz. An Datenbankgrenzen sind konkrete Row-Typen, an externen Grenzen Laufzeitvalidatoren erforderlich.

## Patch N1 – Renderer- und Case-UI-Grenzen

Patch N1 entfernt sämtliche fünf bis dahin unter `src/` inventarisierten
`AnyKeyword`-Fundstellen. Die Case-UI verwendet nun konkrete Verträge für
React-State-Setter, Domänenmodelle, Workbench-Auswahl, Suchzustand und die
Rückgabewerte der beteiligten Hooks. Die Baseline wurde von 249 auf 244
Fundstellen abgesenkt; unter `src/` verbleibt keine explizite `any`-Fundstelle.


## Patch N3: kleine Service-Typgrenzen

Patch N3 entfernt neun weitere Fundstellen aus sechs kleinen, fachlich
abgegrenzten Services. Audit-Log-Zeilen, Lifecycle-Baseline-Zeilen und das
Portable-Profil besitzen nun konkrete Datenbank-Row-Verträge. Die heterogenen
Berichts- und Fallübergabezeilen verwenden ausdrücklich `unknown` als
Wertgrenze statt impliziter Typfreiheit; sicherheitskritische Dokumentfelder
sind zusätzlich konkret typisiert. Die ZIP-Verarbeitung nutzt die vorhandenen
`yauzl`- und Node-Stream-Typen.

Die Baseline sinkt damit von 244 auf 235 Fundstellen. Unter den sechs
bearbeiteten Services verbleibt keine explizite `any`-Fundstelle.

## Patch N4 – Kontakt-, Personen- und Suchservices

Patch N4 entfernt die 50 expliziten `any`-Fundstellen aus den Kontakt-, Personenbindungs- und Suchdiensten. Datenbankabfragen verwenden nun konkrete Row-Verträge; dynamische Suchprovider begrenzen ihre offene Spaltenmenge auf `unknown` und typisieren alle tatsächlich verwendeten Felder. Der Bestand sinkt damit von 235 auf 185 Fundstellen, ohne neue Baseline-Schuld.

## Patch N5 – Prozess- und Beteiligungsservices

Patch N5 entfernt die expliziten `any`-Fundstellen aus den Fristen-, Beteiligungs-, Präventions-, Recruiting-, Kündigungs-, Arbeitsplatzanpassungs-, SBV-Steuerungs- und Ressourcenservices. Datenbankzeilen werden durch fachlich begrenzte Row-Verträge beschrieben; die Baseline sinkt von 185 auf 144 Fundstellen.

## Patch N6 – Abschluss des Explicit-any-Abbaus

Patch N6 entfernt die verbliebenen Fundstellen aus den großen Kernservices sowie
die letzte Testfundstelle. Die versionierte Baseline ist danach leer. Das
AST-Ratchet bleibt als Null-Baseline bestehen und ESLint erzwingt
`@typescript-eslint/no-explicit-any` zusätzlich als Fehler. Damit dürfen weder
Produktivcode noch Tests neue explizite `any`-Typen einführen.
