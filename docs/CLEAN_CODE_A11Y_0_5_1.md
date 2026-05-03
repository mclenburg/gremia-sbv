# Gremia.SBV 0.5.1 – Clean-Code & Barrierefreiheit

## Ziel

0.5.1 schließt zwei technische Restschulden aus der Refaktorierungsphase:

1. LiveRegionProvider konsequenter nutzen.
2. `any` aus `InlineCommandOverlays` entfernen.

## Änderungen

### Live-Region / Screenreader

`useAnnouncer` wird nun zusätzlich in folgenden Bereichen konsequent genutzt:

- `CasesView` / Fallakte:
  - Notiz-Erfolgsmeldungen
  - Notiz-/Dokumenten-/Fallladefehler
  - Case-Toasts
- `TemplatesView`:
  - allgemeine Erfolgsmeldungen
  - allgemeine Fehlermeldungen
- `ReportsView`:
  - Fehler bei Berichtserzeugung
  - erfolgreiche Berichtserzeugung

### InlineCommandOverlays

Die Overlay-Props sind jetzt fachlich typisiert:

- `CaseRecord[]`
- `ContactRecord[]`
- `LegalNormSuggestion`
- `InlineCaseLinkDraft`
- `InlineLegalNormDraft`
- `InlineRiskDraft`
- `InlineOpenTaskDraft`
- `InlineConfidentialityDraft`
- `InlineAnonymizationDraft`
- `InlineContactDraft`
- `InlineDeadlineDraft`

Damit ist die komplexeste Stelle der Inline-Kürzel nicht mehr durch `any` entkoppelt.

## Bewusst nicht enthalten

Der nächste Extraktionsschnitt aus `workflowViews.tsx` bleibt ein separater Patch. 0.5.1 fokussiert Build-nah und risikoarm auf Typensicherheit und Barrierefreiheit.
