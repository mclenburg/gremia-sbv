# Explizites TypeScript-`any`: Null-Ratchet

## Zweck

Gremia.SBV lässt im aktiven TypeScript-Bestand keine expliziten `any`-Typen zu. Die Prüfung basiert auf dem TypeScript-AST und ergänzt die ESLint-Regel `@typescript-eslint/no-explicit-any`.

Eine reine Wortsuche wäre ungeeignet, weil sie Kommentare und Zeichenketten mitzählen und syntaktische Rollen nicht zuverlässig unterscheiden würde.

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
- Verteilung nach Projektbereich und syntaktischer Rolle,
- Abweichungen von der versionierten Baseline.

## Erfasster Umfang

Erfasst wird jedes `AnyKeyword` in nicht generierten Dateien mit den Endungen `.ts`, `.tsx`, `.mts` und `.cts`. Ausgenommen sind Abhängigkeiten, Build-/Release-Ausgaben, Coverage-/Playwright-Ausgaben und `.d.ts`-Deklarationsdateien.

Beispiele für verbotene explizite Typfreiheit sind:

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

## Baseline und Gate

Die versionierte Baseline liegt unter:

```text
maintenance/type-safety/explicit-any-baseline.json
```

Die Baseline ist leer und dient als unabhängiges Null-Ratchet. `npm run type-safety:any-check` muss deshalb ohne Fundstelle durchlaufen. Neue explizite `any`-Typen werden sowohl durch ESLint als auch durch den AST-Audit blockiert.

Die Baseline darf nicht zur Aufnahme neuer Fundstellen erweitert werden, um einen Build grün zu machen. Wenn an einer offenen Systemgrenze ein Typ zunächst nicht bekannt ist, ist `unknown` mit anschließender Laufzeitvalidierung zu verwenden. Datenbankgrenzen erhalten konkrete Row-Verträge.

## Stabile Fundstellenidentität

Der Reporter kann Fundstellen unabhängig von reinen Zeilenverschiebungen identifizieren. Die Identität basiert auf Dateipfad, syntaktischer Rolle, benanntem Kontext, normalisiertem AST-Kontext und Auftretensordinal; die Zeilennummer selbst gehört nicht zur Identität.

Damit bleibt der Audit reproduzierbar und eignet sich auch künftig als harte Regressionserkennung.
