# Gremia.SBV 0.5.8a – ExportGuard Import-Fix

## Problem

`workflowViews.tsx` nutzte `scanBemProcessExport`, importierte die Funktion aber nicht aus `@services/exportGuardPolicy`.

Buildfehler:

```text
TS2304: Cannot find name 'scanBemProcessExport'
```

## Änderung

Der Import wurde ergänzt:

```ts
import { buildExportWarningMessage, scanBemProcessExport, scanSensitiveExportText } from '@services/exportGuardPolicy';
```
