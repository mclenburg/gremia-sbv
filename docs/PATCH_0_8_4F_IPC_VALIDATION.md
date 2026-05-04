# Patch 0.8.4-f – IPC- und Eingabehärtung

Patch 0.8.4-f ist der letzte reine Stabilisierungspatch vor der fachlichen 0.8.5-Linie. Er zieht eine zentrale Laufzeitprüfung an der Electron-IPC-Grenze ein und reduziert das Risiko, dass manipulierte oder versehentlich fehlerhafte Renderer-Eingaben ungeprüft in Services gelangen.

## Zentrale Bausteine

Neu ist `electron/ipc/ipcValidation.ts` mit wiederverwendbaren Prüf- und Normalisierungsfunktionen:

- `assertString()` und `assertOptionalString()`
- `assertPlainObject()` / `assertRecordInput()`
- `assertOptionalObject()`
- `assertBoolean()` / `assertOptionalBoolean()`
- `assertOptionalPositiveInteger()`
- `assertAllowedEnum()`
- `sanitizeDialogFileName()`
- `ensurePathInside()`
- `assertExtension()`

Damit werden IPC-Eingaben nicht mehr nur durch TypeScript-Typen beschrieben, sondern zur Laufzeit geprüft.

## Gehärtete IPC-Module

Die folgenden Module validieren ihre Eingaben nun zentral vor dem Service-Aufruf:

- `caseIpc.ts`
- `contactIpc.ts`
- `deadlineIpc.ts`
- `bemIpc.ts`
- `preventionIpc.ts`
- `equalizationIpc.ts`
- `terminationIpc.ts`
- `knowledgeIpc.ts`
- `templateIpc.ts`
- `retentionIpc.ts`
- `securityIpc.ts`
- `backupIpc.ts`
- `reportIpc.ts`

## Pfad- und Dateiname-Härtung

Besonders abgesichert wurden:

- vorgeschlagene Dokumentexport-Dateinamen: nur noch Basename, keine Pfadbestandteile,
- Report-Preview: nur `.gsbvpdf` aus dem Gremia.SBV-Exportbereich,
- Backup-Ordneröffnung: nur innerhalb des Gremia.SBV-Datenbereichs,
- Report-History-Limit: nur positive Ganzzahlen mit Obergrenze.

## Keine neue Fachfunktionalität

Der Patch fügt bewusst keine neuen SBV-Fachmodule hinzu. Er stabilisiert die Sicherheitsgrenze zwischen Renderer und Main-Prozess, damit 0.8.5 auf einer belastbaren Basis neue Fachlichkeit aufnehmen kann.

## Test

Neu:

```bash
npm run test:ipc-validation-084f
```

Testdatei:

- `tests/ipcValidation084f.test.ts`
