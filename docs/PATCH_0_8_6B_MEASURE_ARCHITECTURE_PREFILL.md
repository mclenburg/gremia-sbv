# Patch 0.8.6-b – Einheitliche Maßnahmenarchitektur, UI und Vorbelegung

## Ziel

Dieser Patch konsolidiert die fallaktenzentrierte Maßnahmenlogik. Die App soll im Live-Gespräch schneller werden, ohne die Aktenstruktur zu umgehen:

- die Fallakte bleibt der fachliche Arbeitsort,
- Maßnahmen werden einheitlich als Fallaktenvorgänge behandelt,
- Inline-Schnellerfassungen nutzen eine zentrale Vorbelegungslogik,
- automatisch vorbelegte Felder sind direkt speicherbar und nur dezent markiert.

## Zentrale Vorbelegung

Neu ist `src/app/features/cases/measures/measurePrefill.ts`.

Die Prefill-Engine nutzt:

- aktuelle Fallakte,
- Fallpriorität,
- Text nach dem Inlinebefehl,
- Maßnahmentyp,
- Systemdatum.

Beispiele:

- `/bet Versetzung ohne Anhörung` belegt Titel, Arbeitgebermaßnahme, Risiko und nächsten Schritt vor.
- `/anp fester Arbeitsplatz wegen Desksharing` belegt Arbeitsplatzkategorie und Rechtsgrundlage-Kontext vor.
- `/kuend ordentliche Kündigung` setzt den Vorgang auf kritisch und belegt den Eingang mit „jetzt“.

## Keine Bestätigungspflicht

Vorbelegte Werte gelten sofort. Es gibt keinen zusätzlichen Button und keinen Pflichtklick. Die SBV kann direkt `Strg+Enter` verwenden oder Werte überschreiben.

## Marker statt Zusatztext

Vorbelegte Felder erhalten nur einen kleinen Marker `◇`. Der Marker ist per Screenreader als „automatisch vorbelegt“ erkennbar. Wird ein Feld geändert, bleibt die Eingabe normal bearbeitbar; die App verlangt keine gesonderte Bestätigung.

## Einheitlicher Maßnahmenkopf

Neu ist `src/app/features/cases/measures/MeasureDetailFrame.tsx`.

Beteiligung und Arbeitsplatzgestaltung nutzen jetzt denselben Detailrahmen für:

- Maßnahmentyp,
- Status,
- Risiko,
- Nachbearbeitung,
- nächsten Schritt.

Damit werden die neuen Maßnahmentypen weiter an eine gemeinsame UI-Grundstruktur angeglichen.

## Datenbank

Die Schema-Version steigt auf `0022`. Ergänzt werden nur Indizes für schnellere Maßnahmenübersichten und Nachbearbeitungsfilter:

- `idx_case_measures_follow_up`
- `idx_case_measure_events_measure_created`

Es werden keine bestehenden Nutzdaten verändert.

## Tests

Neuer Policy-Test:

```bash
npm run test:measure-architecture-086b
```
