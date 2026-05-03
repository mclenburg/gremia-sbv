# Gremia.SBV 0.5.10a – Deadlines Import-Fix

## Problem

`DeadlinesView` und `DeadlineEditor` wurden aus `workflowViews.tsx` ausgelagert, aber `App.tsx` importierte die neuen Komponenten nicht.

Buildfehler:

```text
Cannot find name 'DeadlinesView'
Cannot find name 'DeadlineEditor'
```

## Änderung

`App.tsx` importiert jetzt:

```ts
import { DeadlinesView, DeadlineEditor } from './features/deadlines/DeadlinesView';
```
