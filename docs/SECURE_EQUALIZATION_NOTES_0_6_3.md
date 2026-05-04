# Gremia.SBV 0.6.3 – Gleichstellungsnotizen über verschlüsselte Fallnotizen

## Ziel

Der in 0.6.2 dokumentierte Schuldposten wird nicht nur beschrieben, sondern technisch geschlossen: Neue Gleichstellungs-/GdB-Notizen werden nicht mehr im Feld `equalization_processes.notes` gespeichert.

## Änderung

### Service

`EqualizationService` gibt `notes` nicht mehr als laufenden Klartextinhalt zurück und speichert neue `notes`-Eingaben nicht mehr in `equalization_processes.notes`.

Stattdessen wird nur markiert, ob Altbestand vorhanden ist:

```text
legacyPlaintextNotesPresent
```

### Fallakte

Neue Notizen aus dem Gleichstellungs-/GdB-Detailformular werden als Fallnotizen angelegt:

```text
containsHealthData: true
confidentialLevel: hoch_sensibel
```

Die technische Zuordnung erfolgt über einen internen Marker im Notizinhalt:

```text
[[equalization:<process-id>]]
```

Die Detailansicht filtert diese Fallnotizen und zeigt sie im Gleichstellungsverfahren an.

### Vorlagen

Der Platzhalter `gleichstellung.notizen` gibt keine Freitexte mehr aus dem Prozessdatensatz aus. Stattdessen verweist er auf die verschlüsselten Fallnotizen.

## Wirkung

Neue Gleichstellungsnotizen laufen über denselben geschützten Pfad wie Fallnotizen. Damit ist der 0.6.2-Schuldposten für neue Daten geschlossen.

## Altbestand

Wenn alte Inhalte in `equalization_processes.notes` vorhanden sind, wird dies als `legacyPlaintextNotesPresent` angezeigt. Die manuelle Überführung in verschlüsselte Fallnotizen bleibt als Migrationsaufgabe sichtbar.
