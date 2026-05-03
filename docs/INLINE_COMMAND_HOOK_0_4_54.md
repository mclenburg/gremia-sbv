# Gremia.SBV 0.4.54 – useInlineCommands

## Ziel

Die fachliche Inline-Kürzel-Logik wird aus `CasesView` herausgezogen.

## Neu

```text
src/app/features/cases/inlineCommands/useInlineCommands.ts
```

## Ausgelagert

- Draft-State für `//`, `@@`, `##`, `§§`, `!!`, `>>`, `^^`, `~~`
- Erkennung des ersten Textbefehls
- Öffnen der passenden Overlay-Drafts
- Ersetzen und Entfernen von Markern
- Fallbezug aus `##`
- Normbezug aus `§§`
- Kontaktanlage und Kontakteinfügung aus `@@`
- Fristanlage aus `//`
- offene Aufgabe aus `>>`
- Risiko-Markierung aus `!!`
- Vertraulichkeitsanhebung aus `^^`
- Anonymisierungsvormerkung aus `~~`
- Overlay-Props für `InlineCommandOverlays`

## In CasesView verbleibt

`CasesView` übergibt nur noch Kontext:

- aktueller Fall
- Notiztexte
- Setter für Inhalt und nächste Schritte
- Fristen- und Kontakt-Callbacks
- Statusmeldungen

## Nächster Schritt

Als nächstes sollten Verhaltenstests für die Inline-Befehle folgen, damit die Fachlogik nicht nur strukturell, sondern funktional abgesichert ist.
