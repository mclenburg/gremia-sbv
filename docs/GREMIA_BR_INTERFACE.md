# Spätere Gremia.BR-Leseschnittstelle

Gremia.SBV bleibt ein Offline-Tool. Eine spätere Schnittstelle zu Gremia.BR darf nur lesend umgesetzt werden.

## Zulässige Leserichtung

```text
Gremia.BR -> Gremia.SBV
```

Beispiele:

- Betriebsvereinbarungen lesen
- BR-Termine lesen
- Beschluss- oder Vorgangsreferenzen lesen
- Ansprechpartner lesen

## Nicht zulässig als Standard

```text
Gremia.SBV -> Gremia.BR
```

Insbesondere keine automatische Übertragung von:

- Fallakten
- Namen betroffener Personen
- Gesundheitsdaten
- BEM-Unterlagen
- Gesprächsnotizen

## Adapter-Prinzip

Die spätere Integration wird über eine fachliche Schnittstelle gekapselt:

```ts
export interface GremiaBrReadAdapter {
  listWorksAgreements(): Promise<WorksAgreementReference[]>;
  listRelevantMeetings(): Promise<BrMeetingReference[]>;
  getReferenceById(id: string): Promise<GremiaBrReference | null>;
}
```

Solange keine echte Schnittstelle existiert, verwendet die Anwendung einen `NoopGremiaBrReadAdapter`.
