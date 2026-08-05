# Maintainability-Ratchet

## Ziel

Patch O macht die im Review benannten Monolithen und überlangen Funktionen reproduzierbar messbar. Der Patch behauptet ausdrücklich nicht, dass der bestehende Architekturabbau bereits abgeschlossen ist. Er verhindert aber, dass die vorhandene Schuld unbemerkt wächst oder an neuen Stellen erneut entsteht.

## Gemessene Produktionsbereiche

Der Audit untersucht die produktiven Quellbäume:

- `electron/`
- `services/`
- `src/`

Deklarationsdateien, generierte Dateien, Build-Artefakte, Abhängigkeiten und Tests werden nicht als Produktivarchitektur gezählt.

Für jede Datei werden über den TypeScript-AST ermittelt:

- physische Zeilen,
- tatsächliche Codezeilen ohne Leerzeilen und Kommentare,
- Anzahl der Funktionen, Methoden und Accessoren,
- Länge der größten Funktion,
- Zahl statischer Imports.

## Grenzen für neue Architektur

Neue oder bisher unauffällige Dateien dürfen folgende Werte nicht überschreiten:

| Metrik | Grenze |
|---|---:|
| Physische Zeilen | 500 |
| Codezeilen | 420 |
| Größte Funktion | 120 Zeilen |
| Statische Imports | 35 |

Die Grenzen sind kein Freibrief, Dateien bis exakt zum Maximum wachsen zu lassen. Sie sind die harte CI-Sperre gegen neue Monolithen. Fachlich zusammengehörige Module sollen deutlich kleiner bleiben.

## Umgang mit dem Altbestand

`maintenance/architecture/maintainability-baseline.json` enthält ausschließlich Dateien, die mindestens eine Grenze bereits überschreiten. Für jede dieser Dateien werden die aktuellen Werte als individuelle Obergrenzen eingefroren.

Das Ratchet arbeitet absichtlich asymmetrisch:

- Wachstum über einen Baselinewert ist verboten.
- Verkleinerung ist erlaubt.
- Fällt eine Datei vollständig unter alle allgemeinen Grenzen, muss ihr Baselineeintrag entfernt werden.
- Wird eine Schuld-Datei gelöscht oder zerlegt, muss der verwaiste Baselineeintrag entfernt werden.
- Neue Schuld-Dateien sind nicht zulässig.

Die Baseline darf nicht pauschal neu erzeugt werden, um eine Regression grün zu machen. `--write-baseline` ist nur für die initiale Inventarisierung oder nach nachweislichem Schuldenabbau vorgesehen und muss im Review anhand des Diffs geprüft werden.

## Befehle

```bash
npm run architecture:maintainability
npm run architecture:maintainability:check
npm run architecture:maintainability:baseline
```

Der Check ist Bestandteil von `release:check` und `build:app`. Dadurch gilt die Sperre sowohl für Releases als auch für direkte Produktionsbuilds.

## Priorisierte Zerlegung

Die größten Risiken sind nicht nur Dateien mit vielen Zeilen, sondern insbesondere Dateien mit sehr langen Einzelfunktionen. Vorrangig zu zerlegen sind aktuell:

1. `services/reportService.ts`: Berichtsdatenzugriff, Projektionen, Exportformatierung und Historie trennen.
2. `services/migrationService.ts`: Migrationsorchestrierung von einzelnen Migrationsschritten und Reparaturregeln trennen.
3. `src/app/features/cases/inlineCommands/useInlineCommands.ts`: Parser, Befehlsregister, Ausführung und UI-Hook separieren.
4. `services/templateService.ts`: Repository, Rendering und Vorlagenrichtlinien trennen.
5. `services/caseService.ts`: Fallrepository, Dokumentzugriff, Notizen und Aggregate-Transaktionen separieren.
6. `electron/preload.ts`: API-Verträge nach Domänen gruppieren und aus einer kleinen, sandbox-kompatiblen Komposition exportieren.

Bei jeder Zerlegung gelten folgende Regeln:

- Keine bloße Verschiebung eines Monolithen in eine neue Datei.
- Domänengrenzen und Verantwortlichkeiten bestimmen den Schnitt.
- Abhängigkeiten werden über Konstruktoren oder klar definierte Funktionsparameter injiziert.
- Datenbanktransaktionen bleiben an einem Orchestrierungspunkt sichtbar.
- Mapper und Laufzeitvalidierung bleiben an den Systemgrenzen.
- Verhaltenstests werden vor oder zusammen mit der Zerlegung ergänzt.
- Baselinewerte werden im selben Patch abgesenkt.

## Patch P: Inline-Command-Zerlegung

Der Zustandslebenszyklus der Inline-Command-Entwürfe wurde aus `useInlineCommands.ts` in `useInlineCommandDrafts.ts` extrahiert. Dadurch ist Draft-State-Verwaltung von Befehlsausführung und Texttransformation getrennt. Die individuelle Baseline von `useInlineCommands.ts` wurde abgesenkt; die verbleibenden fachlichen Command-Gruppen sind in weiteren Schritten entlang ihrer Prozessgrenzen zu extrahieren.
