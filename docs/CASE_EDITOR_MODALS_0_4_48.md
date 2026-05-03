# Gremia.SBV 0.4.48 – Fallakten-Modals und Dokumentdetail

## Herausgezogen

- `CaseCreateModal`
- `CaseProcessDraftModal`
- `CaseDocumentDetail`
- `CaseWorkbenchFooter`

## Vorbereitet

- `useCaseDocuments`
- `useCaseNoteEditor`
- `InlineCommandOverlays`

## Hinweis

Notizeditor und Inline-Befehle bleiben fachlich noch in `CasesView`, weil sie stark an denselben lokalen Formular- und Overlay-State gekoppelt sind. Der nächste saubere Schritt ist `useCaseNoteEditor` mit anschließendem echten `InlineCommandOverlays`.
