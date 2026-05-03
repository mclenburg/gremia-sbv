# Gremia.SBV 0.4.45 – CasesView in erste Bausteine schneiden

## Ziel

Die Fallakte ist das Hauptwerkzeug der App. Deshalb wird `CasesView` nicht in einem riskanten Schritt komplett zerlegt, sondern kontrolliert in stabile Bausteine geschnitten.

## Änderungen

Neu unter `src/app/features/cases/`:

- `CaseTreePanel.tsx`
- `CaseDetailPanel.tsx`
- `ProcessTemplateDocumentsModal.tsx`
- `caseWorkbenchTypes.ts`

## Ausgelagert

- Fallbaum mit Maßnahmen, Notizen und Dokumenten
- Detailpanel-Shell inklusive Volltextsuche
- Dokumenten-Overlay für maßnahmenbezogene Vorlagen
- gemeinsame Typen für Fallbaum und Detailpanel

## Bewusst noch nicht ausgelagert

- Notiz-/Protokollformular
- Inline-Overlay-Logik
- Präventionsdetailformular
- Dokumenten-Upload
- Fallanlage-Modal

Diese Teile hängen noch eng an lokalen States und werden in späteren Schritten in Hooks und Detailkomponenten zerlegt.

## Nächster sinnvoller Schritt

0.4.46 sollte `useCaseWorkbenchData` und `useCaseNoteEditor` vorbereiten, damit `CasesView` weiter schrumpft, ohne die Fallaktenlogik zu beschädigen.
