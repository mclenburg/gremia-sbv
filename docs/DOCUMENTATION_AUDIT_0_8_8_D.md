# Dokumentationsprüfung 0.8.8-d

## Ziel

Vor dem ersten Release Candidate soll die Dokumentation nicht mehr aus vielen historischen Patchnotizen bestehen. GitHub und Projektarbeit brauchen wenige aktuelle, dauerhafte Einstiegsdokumente.

## Ergebnis

### Behalten und aktualisieren

- `README.md`
- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/CHANGELOG.md`
- Datenschutz- und Sicherheitsdokumente
- Build-, Datenbank- und Betriebsdokumente mit dauerhaftem Nutzen

### Entfernen aus dem aktiven Bestand

- historische Patchnotizen,
- alte Buildfix-Dokumente,
- Zwischenstandsnotizen aus Refactorings,
- alte Test-Fix-Dokumente,
- versionsgebundene UI-/Modulnotizen, die durch aktuelle Architektur- und Entwicklungsdokumentation ersetzt wurden.

Die Entfernung erfolgt über `maintenance/source-cleanup/obsolete-files-0.8.8-d.json`.

## Begründung

Patchnotizen sind während der Entwicklung hilfreich, werden aber vor einem RC zur Last, wenn sie veraltete Versionsstände, alte Dateinamen und frühere Architekturentscheidungen dokumentieren. Die dauerhafte Dokumentation muss den aktuellen Zustand beschreiben.

## Folge

Neue Doku soll künftig einer dieser Kategorien zugeordnet werden:

1. Projekt-README,
2. Architektur,
3. Entwicklung und Build,
4. Datenschutz/Security,
5. Release/Abnahme,
6. Changelog.

Kurzlebige Patchdetails gehören nicht mehr als eigenständige Markdown-Dateien in `docs/`.
