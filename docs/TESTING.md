# Teststeuerung

Die Testsuite besitzt zwei voneinander getrennte Verträge:

- `maintenance/test-quality/functional-coverage-matrix.json` ordnet kritischen produktiven Einstiegspunkten konkrete Positiv-, Negativ-, Grenz-, Persistenz-, Rollback-, Datenschutz-, Integrations- und Manipulationstests zu.
- `maintenance/test-quality/test-suite-groups.json` teilt jede Datei unter `tests/` exakt einer ausführbaren Testgruppe zu.

## Testgruppen

| Befehl | Zweck |
| --- | --- |
| `npm run test:fast` | Deterministische Unit- und Policy-Verhaltenstests für kurze lokale Rückmeldung |
| `npm run test:integration` | Datenbank-, Migrations-, Bridge- und domänenübergreifende Persistenztests |
| `npm run test:security` | Security-, Datenschutz-, Kryptografie-, Backup-/Restore- und Löschpfade |
| `npm run test:architecture` | Architektur-, Build-, Release-, Dependency- und statische Artefaktverträge |
| `npm run test:all` | Vollständiger funktionaler Testlauf |

Die Gruppen werden in der angegebenen Präzedenzreihenfolge ausgewertet. Die erste passende Gruppe gewinnt. Der Fallback `fast` stellt sicher, dass neue Testdateien nicht unbemerkt aus allen Läufen fallen. Das Gate `npm run test:groups:check` verlangt gleichzeitig, dass jede Datei exakt einmal zugeordnet ist und keine Gruppe leer bleibt.

## Funktionsabdeckungsmatrix

Jeder Eintrag benennt:

- produktive Datei und Einstiegspunkt,
- Kritikalität und Datenänderungscharakter,
- konkrete Testdatei und exakten Testnamen je Kategorie,
- eine fachliche Begründung für jede bewusst nicht einschlägige Kategorie.

`npm run test:matrix:check` bricht ab, wenn Produktivdatei, Einstiegspunkt, Testdatei oder benannter Test fehlen. Kritische Funktionen benötigen mindestens einen Positiv- und Negativtest. Datenänderungen benötigen Persistenz- oder Rollbackabsicherung. Security-Funktionen benötigen einen Missbrauchs- oder Manipulationstest.

## Releasevertrag

`build:verify` prüft Matrix und Gruppierung vor Lint, Coverage und Compile. `test:coverage` und damit der Releaseweg führen weiterhin die vollständige Testsuite aus; die Gruppen dienen der schnelleren lokalen Steuerung und ersetzen den Gesamtlauf nicht.
