# Gremia.SBV 0.4.57a – Typfix im Inline-Command-Verhaltenstest

## Problem

`tests/inlineCommandBehavior0456.test.ts` übergab an `formatLegalNormText` ein Objekt mit `id`, `source` und `shortText`.

Die Funktion erwartet typisiert nur:

```ts
Pick<LegalNormSuggestion, "title" | "paragraph">
```

## Änderung

Der Test nutzt jetzt nur noch:

```ts
{
  paragraph: "§ 178 Abs. 2 Satz 1 SGB IX",
  title: "Unterrichtung und Anhörung"
}
```

Anwendungscode wurde nicht geändert.
