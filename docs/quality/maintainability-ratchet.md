# Maintainability-Ratchet

## Ziel

Der Maintainability-Audit verhindert neue Monolithen und macht verbleibende strukturelle Schuld reproduzierbar sichtbar. Er bewertet die produktiven Quellbäume `electron/`, `services/` und `src/` über den TypeScript-AST.

Deklarationsdateien, generierte Dateien, Build-Artefakte, Abhängigkeiten und Tests werden nicht als Produktivarchitektur gezählt.

## Harte Grenzen

Für jede produktive Datei werden physische Zeilen, tatsächliche Codezeilen, die Länge der größten Funktion beziehungsweise Methode und die Zahl statischer Imports ermittelt.

| Metrik | Grenze |
|---|---:|
| Physische Zeilen | 500 |
| Codezeilen | 420 |
| Größte Funktion | 120 Zeilen |
| Statische Imports | 35 |

Die Grenzen sind kein Zielwert und kein Freibrief zum Wachstum bis an das Maximum. Fachlich zusammengehörige Module sollen deutlich kleiner bleiben.

## Verbleibende Schuld

`maintenance/architecture/maintainability-baseline.json` enthält ausschließlich noch ausdrücklich inventarisierte Grenzüberschreitungen. Nach der Zerlegung der Datei- und Importmonolithen darf die Baseline keine Schuld für `physicalLines`, `codeLines` oder `imports` konservieren; verbleibende Einträge betreffen überlange Funktionen und Methoden.

Die aktuelle Anzahl und die betroffenen Dateien werden bewusst nicht in dieser Dokumentation dupliziert. Maßgeblich ist immer der maschinell erzeugte Bericht.

Das Ratchet arbeitet asymmetrisch:

- Wachstum über einen Baselinewert ist verboten.
- Verkleinerung ist erlaubt.
- Fällt eine Datei vollständig unter alle allgemeinen Grenzen, muss ihr Baselineeintrag entfernt werden.
- Wird eine Schuld-Datei gelöscht oder fachlich zerlegt, muss der verwaiste Baselineeintrag entfernt werden.
- Neue Schuld-Dateien sind nicht zulässig.
- Eine Verbesserung in einer Metrik darf keine Verschlechterung in einer anderen Metrik verdecken.

Die Baseline darf niemals pauschal neu erzeugt werden, um eine Regression grün zu machen.

## Befehle

```bash
npm run architecture:maintainability
npm run architecture:maintainability:check
npm run architecture:maintainability:baseline
```

Der Check ist Bestandteil der Build- und Release-Gates.

## Regeln für weitere Zerlegung

Bei jeder weiteren Bereinigung gelten folgende Regeln:

1. Keine bloße Verschiebung eines Monolithen in eine neue Datei.
2. Domänengrenzen und Verantwortlichkeiten bestimmen den Schnitt.
3. Abhängigkeiten werden über Konstruktoren oder klar definierte Funktionsparameter injiziert.
4. Datenbanktransaktionen bleiben an einem Orchestrierungspunkt sichtbar.
5. Mapper und Laufzeitvalidierung bleiben an den Systemgrenzen.
6. Verhaltenstests werden vor oder zusammen mit der Zerlegung ergänzt.
7. Baselinewerte werden im selben Änderungssatz abgesenkt.
8. Lange React-Komponenten werden nach Zustand, Orchestrierung und Darstellung getrennt, nicht nur nach Zeilenzahl.

Damit ist die Baseline ein kontrollierter Abbaupfad und keine dauerhafte Ausnahmegenehmigung.
