# Fallakten-Workflow

Stand: **0.9.1**

## Grundsatz

Die Fallakte ist der führende Arbeitsraum für SBV-Vorgänge. Ab 0.9.1 gilt als Zielbild: reguläre neue Fallakten werden an eine Person im Personenverzeichnis gebunden. Wenn keine Identität genannt werden soll, wird eine anonyme Beratungsanfrage angelegt.

## Fallakte anlegen

Zielablauf:

1. Person suchen,
2. Person auswählen oder neu anlegen,
3. alternativ anonyme Beratungsanfrage dokumentieren,
4. Fallakten-Grunddaten erfassen,
5. Fallakte anlegen.

## Legacy-Fälle

Bestehende Fälle werden in der Migration nicht geratenhaft aus Freitexten verknüpft. Sichere vorhandene Links können übernommen werden; mehrdeutige oder fehlende Links erzeugen `legacy_unlinked` mit Priorisierung.

## Datenschutzprüfung

Eine Fallakte wird prüfpflichtig bei:

- Schutzstatus abgelaufen,
- Beschäftigung beendet,
- Person anonymisiert,
- Person gelöscht,
- Altfall ohne sicheren Personenbezug.

Entscheidungsmöglichkeiten:

- Status aktualisieren,
- Fortspeicherung begründen,
- anonymisieren,
- löschen.

## Barrierefreiheit

Fallakte-anlegen-Dialog, Personenauswahl, anonyme Anfrage und Datenschutzdialog müssen per Tastatur bedienbar sein, Fokus korrekt führen und Announcer-Meldungen ausgeben.
