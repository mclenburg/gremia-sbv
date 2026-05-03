# Gremia.SBV 0.5.7 – BEM-Statusführung und Vorlagenpaket

## Ziel

0.5.7 macht das BEM-Modul alltagstauglicher. Nach 0.5.6 waren die Felder vorhanden; jetzt führt die Oberfläche stärker durch den Prozess und liefert BEM-spezifische Vorlagen.

## BEM-Statusführung

Neu:

```text
services/bemGuidancePolicy.ts
```

Die Policy liefert:

- Ziel des aktuellen BEM-Status,
- fehlende Pflicht-/Sollfelder,
- Statusvorschlag für den nächsten fachlichen Schritt.

Im BEM-Detailformular wird dies als `bem-guidance-panel` angezeigt. Der Statusvorschlag kann direkt übernommen werden.

## BEM-Vorlagenpaket

Neue Systemvorlagen:

```text
bem-angebot-datenschutz
bem-einwilligung-beteiligte
bem-gespraechsprotokoll
bem-massnahmenplan
bem-wirksamkeitspruefung
bem-abschlussvermerk
```

Die Vorlagen sind über Tags wie `massnahme:bem` und `status:<status>` an den jeweiligen BEM-Status gebunden.

## Neue BEM-Platzhalter

Die Kontextwerte enthalten nun zusätzlich:

```text
bem.datenschutz_hinweis
bem.einwilligungsumfang
bem.widerruf_am
bem.aufbewahrung
bem.verantwortliche
bem.abschlussgrund
```

Damit können BEM-Dokumente deutlich zielgenauer gerendert werden.
