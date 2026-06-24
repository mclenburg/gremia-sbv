# Tätigkeitsjournal

Das Tätigkeitsjournal ergänzt Gremia.SBV um eine interne Eigenaufzeichnung der Schwerbehindertenvertretung. Es dokumentiert, welche SBV-Tätigkeit wann, in welchem fachlichen Kontext und mit welchem Ergebnis erfolgt ist. Zeitangaben bleiben optional und dienen ausschließlich der eigenen Nachweisführung der SBV.

Das Modul ist keine Arbeitgeber-Zeiterfassung, keine Überstundenabrechnung und keine Arbeitgeber-Freigabelogik.

## Datenschutzlinie

- Ein Journaleintrag entsteht nur durch bewusstes Speichern.
- Der Kern speichert keine flüchtigen Kontextvorschläge.
- Audit-Einträge enthalten keine Freitexte aus Titel, Beschreibung oder Ergebnisnotiz.
- Audit-Metadaten sind begrenzt auf Entry-ID, Kategorie, Status, Datum, Linkanzahl und Zeit-vorhanden-ja/nein.
- Fallfreie Journal-Einträge werden nicht in den fallzentrierten Suchindex geschrieben.
- `exported_for_activity_report_at` ist nur der letzte bekannte Exportzeitpunkt, keine Exporthistorie.

## Schema

Die Journal-Migration legt drei Kernstrukturen an:

- `activity_journal_entries`
- `activity_journal_links`
- `activity_journal_category_preferences`

Die Fresh-Install-Struktur, Schema-Version, Integritätsprüfung und Reparaturroutine werden gemeinsam weitergeführt.

## Service- und IPC-Schicht

Der Main-Prozess enthält:

- `ActivityJournalService` für CRUD, Links, lokale Suche, Summary, Exportmarkierung und Wiedervorlagen-Synchronisation.
- `ActivityJournalPreferenceService` für eine datensparsame Kategoriepräferenz je Kontexttyp.
- `ActivityJournalTitleService` für datensparsame Titelvorschläge.
- `activityJournalPrefill.ts` als schreibfreie Prefill-Logik.
- `activityJournalIpc.ts` als typisierte Renderer-Brücke.

## Retention

Das Löschkonzept erkennt Journal-Einträge als eigene Prüfdomain:

- fallfreie Einträge nach konfigurierbarer Monatsfrist,
- offene Journal-Wiedervorlagen als Sperr- oder Prüfgrund,
- exportierte Einträge als gesondert prüfpflichtig,
- fallverlinkte Einträge mit aktiver Fallakte als fallabhängig.

## Grenzen des aktuellen Modulkerns

Kontextbuttons, Textcommands, ephemere Aktivitätsvorschläge, Wochenabschlussmarker und der vollständige Tätigkeitsbericht-Export werden schrittweise ergänzt. Der Kern bleibt bewusst klein, prüfbar und datenschutzfest gehalten.
