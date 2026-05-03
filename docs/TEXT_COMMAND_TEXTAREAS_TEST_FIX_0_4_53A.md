# Gremia.SBV 0.4.53a – Test-Quoting korrigiert

## Problem

`tests/textCommandTextareas0453.test.ts` enthielt nicht escaped doppelte Anführungszeichen in String-Literalen.

## Änderung

Die betroffenen Erwartungen wurden auf einfache String-Literale umgestellt:

```ts
expect(noteModal).toContain('fieldId="case-note-content"');
```

Fachcode wurde nicht geändert.
