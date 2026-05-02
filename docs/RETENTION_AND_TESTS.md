# Lösch- und Aufbewahrungskonzept

Gremia.SBV löscht aus Datenschutzgründen nicht automatisch. Die App erkennt Prüfkandidaten und bietet bewusst bestätigungspflichtige Aktionen an.

## Prüfkandidaten

- abgeschlossene Fälle nach konfigurierbarer Frist
- offene Fälle ohne erkennbare Aktivität
- Kontakte ohne erkannte Textreferenz
- Fristen ohne Fallbezug
- erledigte Fristen nach Aufbewahrungsfrist
- Dokumenteinträge mit fehlendem Container oder unvollständigen Verschlüsselungsmetadaten
- mögliche Klartextdateien im geschützten Dokumenten- oder Exportbereich

## Aktionen

### Fall anonymisieren

Bestätigung: `FALL ANONYMISIEREN`

Die personenbezogene Fallanzeige wird anonymisiert, Notiztexte werden reduziert, FTS-Indizes werden bereinigt und die Aktion wird in `retention_actions` protokolliert.

### Fall löschen

Bestätigung: `FALL LÖSCHEN`

Fall, Notizen, Fristen, Dokumentmetadaten und verschlüsselte Dokumentcontainer werden entfernt. Vor dieser Aktion sollte ein verschlüsseltes Backup erzeugt werden.

## Tests

Neue Funktionalität muss ab jetzt Tests enthalten. Für dieses Paket wurden ergänzt:

- `tests/retentionPolicy.test.ts`
- `tests/backupPayloadPolicy.test.ts`

Zusätzliche Skripte:

```bash
npm run test
npm run test:retention
npm run release:check
```
