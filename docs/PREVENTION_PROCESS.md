# Präventionsverfahren nach § 167 Abs. 1 SGB IX

Version: 0.4.0

Das Präventionsverfahren ist als erster vollständiger SBV-Fachprozess umgesetzt. Es hängt immer an einer Fallakte und erzeugt bei Bedarf automatisch eine Wiedervorlage für die Arbeitgeberreaktion.

## Grundlogik

- Fallakte bleibt führendes Objekt.
- Präventionsverfahren kann nur mit Fallbezug angelegt werden.
- Beim Anlegen kann die erste Kenntnis, die Arbeitgeberanforderung und die Reaktionsfrist erfasst werden.
- Ohne manuelle Frist wird eine Wiedervorlage sieben Tage nach Arbeitgeberanforderung gesetzt.
- Bei Kündigungs- oder Arbeitsplatzverlustrisiko wird die Wiedervorlage kritisch markiert.

## Workflow-Schritte

Jeder Schritt hat eine kleine Tooltip-Hilfe über das Fragezeichen:

1. Gefährdung erfassen
2. Status der Person klären
3. Schwierigkeit einordnen
4. Arbeitgeber aktivieren
5. Beteiligte verknüpfen
6. Inklusionsamt prüfen
7. Maßnahmen dokumentieren
8. Wiedervorlage setzen
9. Abschluss bewerten

## Warnlogik

Die Warnlogik prüft insbesondere:

- fehlendes Datum der ersten Kenntnis
- fehlendes Anforderungsdatum
- Frist Arbeitgeberreaktion läuft binnen 48 Stunden ab
- Frist Arbeitgeberreaktion ist überschritten
- Kündigungs-/Arbeitsplatzverlustrisiko ohne dokumentierte Einschaltung des Inklusionsamts
- blockierte oder verweigerte Verfahren
- laufende Verfahren ohne Wiedervorlage

## Tests

Neue Tests:

```bash
npm run test:prevention
```

Geprüft werden Tooltip-Schritte, Standardfrist, 48h-Warnung, überfällige Arbeitgeberreaktion und Inklusionsamt-Warnung bei Kündigungsrisiko.
