# Gremia.SBV 0.6.0a – Gleichstellung Import-Fix

## Problem

`workflowViews.tsx` nutzte `UpdateEqualizationProcessInput`, importierte den Typ aber nicht.

Buildfehler:

```text
TS2552: Cannot find name 'UpdateEqualizationProcessInput'
```

## Änderung

Ergänzt wurde:

```ts
import type { UpdateEqualizationProcessInput } from './core/models/equalization.model';
```
