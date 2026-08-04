# Führende Fachaggregate

## Grundsatz

Jeder fachliche Vorgang besitzt genau eine führende Identität. Zusatztabellen sind keine zweiten Vorgänge, sondern 1:1-Erweiterungen des führenden Datensatzes. Berichte zählen ausschließlich Lifecycle-Ereignisse des führenden Aggregats.

## Fallmaßnahmen

`case_measures.id` ist die fachliche Identität aller fallbezogenen Maßnahmen. `case_measure_participation.measure_id` und `case_measure_workplace_accommodation.measure_id` verwenden exakt diese Identität und dürfen ohne passenden Root-Datensatz nicht existieren.

Die Erweiterung `case_measure_participation` ist nur zulässig, wenn `case_measures.type = 'sbv_participation'`. Die Erweiterung `case_measure_workplace_accommodation` ist nur zulässig, wenn `case_measures.type = 'workplace_accommodation'`.

Anlegen, Statuswechsel, Abschluss und Löschung werden am Root-Aggregat protokolliert. Erweiterungstabellen liefern fachliche Detailfelder, aber keine zusätzliche Maßnahme für Tätigkeitsberichte.

## Kündigungsanhörungen

`termination_hearings.id` ist die einzige fachliche Identität. Der produktive Zugriff erfolgt ausschließlich über `TerminationService`. Ein zweiter Service mit abweichendem Status- und Feldmodell wird nicht ausgeliefert.

## Audit und Tätigkeitsjournal

Das allgemeine Audit dokumentiert Zugriff und Änderung. Das Lifecycle-Audit ist die manipulationsgeschützte Ereignisquelle für Maßnahmenberichte. Das Tätigkeitsjournal ist ein bewusst erfasster Arbeitsnachweis und keine Ersatzquelle für Lifecycle-Zähler. Keines dieser Systeme ist ein zweites Fachaggregat.

## Löschen

Gelöscht wird über den Root-Datensatz. Erweiterungen werden über Fremdschlüssel mit `ON DELETE CASCADE` entfernt. Direkte Löschungen einer Erweiterung dürfen keinen vermeintlich weiterbestehenden Root-Vorgang erzeugen.

## Startprüfung

Nach den Migrationen prüft `DomainAggregateIntegrityService` alle registrierten 1:1-Erweiterungen auf verwaiste Datensätze und falsche Root-Typen. Bei einem Verstoß startet der Fachbetrieb nicht mit einem still inkonsistenten Datenmodell.
