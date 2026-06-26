# Barrierefreiheit und bedienbare Sicherheit

Gremia.SBV ist ein Werkzeug für Schwerbehindertenvertretungen. Barrierefreiheit ist deshalb kein nachgelagerter Komfort, sondern Teil des fachlichen und technischen Sicherheitsversprechens.

## Grundsatz

Eine SBV muss vertrauliche Vorgänge sicher bearbeiten können, auch wenn sie selbst mit Screenreader, Tastatur, starker Vergrößerung, reduzierter motorischer Präzision oder erhöhter kognitiver Belastung arbeitet.

Daraus folgen verbindliche Produktregeln:

- Jede Kernfunktion ist mit der Tastatur erreichbar.
- Sichtbarer Fokus darf nicht entfernt oder verdeckt werden.
- Fehler, Warnungen und erfolgreiche Aktionen werden sichtbar und für Screenreader wahrnehmbar gemeldet.
- Status, Risiken und Fristen werden nicht allein über Farbe vermittelt.
- Formulare verknüpfen Label, Hilfetext und Fehlermeldung technisch nachvollziehbar.
- Dialoge halten den Fokus, lassen sich kontrolliert schließen und geben den Fokus zurück.
- Keine Kernaktion darf nur über Hover, Drag-and-drop oder ein Icon ohne Namen erreichbar sein.

## Verbindliche UI-Verträge

### Formulare

Neue oder geänderte Formulare müssen die zentralen Formular-Komponenten verwenden. Pflichtfelder, Hilfetexte und Fehlermeldungen werden nicht lokal nachgebaut.

Ein gültiges Formularfeld hat grundsätzlich:

- ein sichtbares Label,
- eine technische Label-Verknüpfung,
- eindeutige Fehlermeldung,
- `aria-invalid` bei Fehlern,
- `aria-describedby` für Hilfe- und Fehlertext,
- keine Speicherung allein über versteckte Tastenkombinationen.

### Dialoge

Dialoge benötigen:

- `role="dialog"` oder `role="alertdialog"`,
- `aria-modal="true"`,
- klare Überschrift,
- Fokus beim Öffnen im Dialog,
- Fokus-Rückgabe beim Schließen,
- Escape-Verhalten, soweit fachlich zulässig,
- keine destruktive Aktion ohne bewusste Bestätigung.

### Live-Regionen

Kernaktionen nutzen die zentrale Live-Region. Dazu gehören insbesondere:

- Speichern,
- Validierungsfehler,
- Dokumenterzeugung,
- Export,
- Backup und Restore,
- Fristabschluss,
- Statuswechsel,
- destruktive Datenschutzaktionen.

Live-Regionen dürfen keine Namen, Diagnosen, Personalnummern oder vertraulichen Freitextinhalte ausgeben.

## Beteiligungsverstoß-Flow

Der Beteiligungsverstoß-Flow ist ein besonders sensibler Arbeitsweg. Er muss auch ohne Maus beherrschbar bleiben:

1. Ausgangskontext bewusst wählen oder aus der SBV-Beteiligungsmaßnahme übernehmen.
2. Pflichtverletzung und richtiges Verfahren erfassen.
3. Fehler vor dem Speichern nachvollziehbar erhalten.
4. Erst nach bewusster Bestätigung speichern.
5. Erfolg oder Fehler über Live-Region melden.

Die UI-Validierung ersetzt nicht die Main-Prozess-Validierung. Sie dient Bedienbarkeit, Fehlervorbeugung und Barrierefreiheit.

## Testlinie

Barrierefreiheit wird nicht nur manuell geprüft. Relevante Gates sind:

```bash
npm run test:e2e:a11y
npm run test:e2e:core-ui-flows
npm run test:e2e:complete-tour
npm run release:local-e2e
```

Für neue Flows gilt: Tests sollen vorrangig über Rollen, Labels, Fokuszustände und fachliche Branches prüfen. Reine Stringtests sind nur zulässig, wenn der Text selbst der Accessibility-Vertrag ist, zum Beispiel bei sichtbaren Pflichtwarnungen oder Screenreader-Ankündigungen.

## Manuelle Prüfpunkte vor Veröffentlichung

Vor einer öffentlichen Bereitstellung wird mindestens geprüft:

- Tastaturdurchlauf durch Dashboard, Fallakte, Fristen, Journal und Beteiligungsverstoß.
- Zoom auf 200 Prozent ohne horizontalen Zwangsscroll in Kernformularen.
- Light- und Dark-Mode mit sichtbarem Fokus.
- Screenreader-kompatible Fehlermeldungen in Kernformularen.
- Keine rein farbliche Unterscheidung bei Fristen, Risiken und Status.
- Dialoge blockieren und verlassen den Fokus sauber.

## Nicht verhandelbare Grenze

Eine Funktion, die sensible SBV-Daten verarbeitet, aber mit Tastatur oder Screenreader nicht sicher bedienbar ist, ist nicht releasefähig. Sie muss entweder vor Veröffentlichung gehärtet oder aus dem öffentlichen Build herausgenommen werden.
