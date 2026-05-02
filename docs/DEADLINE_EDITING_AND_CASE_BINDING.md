# Gremia.SBV 0.3.15 – Fristenbearbeitung und Fallbindung

## Dashboard-Fristen sind Arbeitsobjekte

Fristen, die auf dem Dashboard erscheinen, können direkt bearbeitet werden. Das Dashboard ist damit nicht nur eine Anzeige, sondern eine operative Arbeitsfläche.

Mögliche Aktionen:

- Frist bearbeiten
- Fälligkeitsdatum ändern
- Schweregrad ändern
- Rechtsbezug / Notiz ergänzen
- Änderungsgrund dokumentieren
- Frist als erledigt markieren

Jede Änderung wird über den `DeadlineService` gespeichert und im `deadline_audit` dokumentiert.

## Fallbindung als fachliche Regel

Gremia.SBV unterscheidet bewusst zwischen:

1. **fallgebundenen Fristen**
   - Rechtsfristen
   - BEM-Schritte
   - Präventionsverfahren
   - Gleichstellung / GdB
   - Kündigungsanhörungen
   - Arbeitgeberreaktionen zu konkreten Fällen

2. **freien Wiedervorlagen**
   - allgemeine Erinnerung ohne personenbezogenen Fallbezug
   - organisatorische SBV-Wiedervorlage

Produktregel:

> Rechtliche Fristen und Workflow-Schritte dürfen nicht ohne Fallbezug angelegt werden.

Ohne Fallbezug erlaubt die Anwendung nur:

```text
processType = custom
deadlineType = follow_up
isLegalDeadline = false
```

Damit wird verhindert, dass echte SBV-Fallarbeit außerhalb der Fallakte verstreut wird.

## Neue IPC-Brücke

Ergänzt wurde:

- `electron/ipc/deadlineIpc.ts`
- `window.gremiaSbv.deadlines.*`
- echte SQLCipher-basierte Datenbankzugriffe für Fristen
- SQLCipher-basierte Fallliste statt lokaler UI-Dummy-Fälle

## Bedienung

1. Fall anlegen unter **Fälle**.
2. Frist anlegen unter **Fristen** und Fall auswählen.
3. Sobald eine offene Frist im 48h-Fenster liegt, erscheint sie auf dem Dashboard.
4. Auf dem Dashboard **Bearbeiten** oder **Erledigt** wählen.

Freie Wiedervorlagen sind weiter möglich, müssen aber bewusst über die Checkbox „freie Wiedervorlage ohne Fallbezug“ angelegt werden.
