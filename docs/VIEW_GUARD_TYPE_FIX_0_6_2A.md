# Gremia.SBV 0.6.2a – ViewId Type-Fix

## Problem

`IMPLEMENTED_VIEW_IDS` enthielt `usb`. Dieser Wert ist aber kein gültiger `ViewId` aus der Modulnavigation.

Buildfehler:

```text
Type '"usb"' is not assignable to type 'ViewId'
```

## Änderung

`usb` wurde aus `IMPLEMENTED_VIEW_IDS` entfernt. Das Set enthält nur gültige implementierte Views.
