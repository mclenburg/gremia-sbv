# Gremia.SBV 0.4.55a – Build-Fix für useCaseNoteEditor

## Problem

Nach 0.4.55 wurde `setNoteError` in `useCaseWorkbenchData` verwendet, bevor es aus `useCaseNoteEditor` destrukturiert wurde. Außerdem blieb ein alter Direktaufruf von `resetNoteForm()` stehen.

## Änderung

- eigener früher `caseLoadError`-State vor `useCaseWorkbenchData`
- `useCaseWorkbenchData({ onError: setCaseLoadError })`
- Weitergabe von `caseLoadError` an `setNoteError` nach Initialisierung von `useCaseNoteEditor`
- alter `resetNoteForm()`-Aufruf durch `noteEditor.resetNoteForm()` ersetzt
