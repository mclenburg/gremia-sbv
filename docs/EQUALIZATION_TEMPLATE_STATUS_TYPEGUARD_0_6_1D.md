# Gremia.SBV 0.6.1d – Type-Guard-Fix für Prozessvorlagenmodal

## Problem

`ProcessTemplateDocumentsModal` erhielt eine Union aus:

- `PreventionProcessRecord`
- `BemProcessRecord`
- `EqualizationProcessRecord`

Die Abfrage über `state.processType` reichte TypeScript nicht zum Narrowing von `state.process`. Deshalb waren direkte Zugriffe auf `status` beziehungsweise `applicationStatus` fehlerhaft.

## Änderung

Ergänzt wurden Type-Guards:

```ts
isEqualizationProcessRecord(...)
hasGenericProcessStatus(...)
```

Die Statusanzeige und der Status-Tag nutzen diese Guards, bevor sie auf `applicationStatus` oder `status` zugreifen.
