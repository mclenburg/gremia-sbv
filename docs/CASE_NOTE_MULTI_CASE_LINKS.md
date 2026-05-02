# Gesprächsnotizen mit mehreren Fallbezügen

Ab Version 0.3.18 können Gesprächsnotizen und Protokolle mehreren Fallakten zugeordnet werden.

## Fachlicher Grund

In der SBV-Praxis werden Gespräche häufig nicht sauber fallisoliert geführt. Ein Gespräch mit Personalabteilung, Führungskraft oder Inklusionsamt kann mehrere Beschäftigte oder mehrere laufende Vorgänge betreffen. Deshalb ist die Gesprächsnotiz nun ein eigenständiges Objekt mit Fallverknüpfungen.

## Modell

Die Tabelle `case_notes` bleibt bestehen. Der ursprüngliche `case_id` bleibt als primärer Fallbezug erhalten. Zusätzliche Fallbezüge werden über die neue Relationstabelle gespeichert:

```sql
case_note_cases(note_id, case_id, is_primary, created_at)
```

Dadurch gilt:

- eine Notiz wird nur einmal gespeichert,
- sie kann in mehreren Fallakten erscheinen,
- Bearbeitung an einer Stelle wirkt in allen verknüpften Fallakten,
- die Volltextsuche findet die Notiz in jedem verknüpften Fall.

## UI

Im Notizformular gibt es den Bereich **Fallbezüge**. Der aktuell geöffnete Fall ist immer gesetzt. Weitere Fälle können zusätzlich markiert werden.

## Datenschutz

Bei übergreifenden Notizen ist besonders darauf zu achten, keine personenbezogenen Details eines Falls unnötig in eine andere Fallakte hineinzutragen. Technisch ist die Mehrfachverknüpfung gewollt; fachlich sollte sie nur genutzt werden, wenn der Termin tatsächlich mehrere Fälle betrifft.
