# Build-Fix 0.4.25 – Prozessvorlagen

Dieser Patch behebt die TypeScript-Fehler aus `src/app/App.tsx` nach dem Patch `0.4.25-process-status-templates`.

## Änderungen

- Der Render-Aufruf für Präventionsvorlagen nutzt wieder die vorhandene Bridge-Signatur `RenderTemplateInput`.
- Das unnötige Feld `sourceId` wurde aus `templates.render(...)` entfernt; die Status-/Maßnahmenwerte werden bereits über `values` übergeben.
- Der lokale State `newTemplateProcessStatus` wurde in `TemplatesView` ergänzt.
- Damit sind die gemeldeten Fehler `TS2352` und `TS2304` adressiert.

## Anwendung

ZIP im Projektwurzelverzeichnis entpacken und vorhandene Dateien überschreiben.
Danach erneut ausführen:

```bash
npm run build:linux
```
