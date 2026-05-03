# Gremia.SBV 0.4.53 – Eingabekürzel für große Textfelder vorbereiten

## Ziel

Die Eingabekürzel `//`, `@@`, `##`, `§§`, `!!`, `>>`, `^^` und `~~` sollen nicht auf das Notizformular der Fallakte beschränkt bleiben.

## Neu

```text
src/app/shared/textCommands/TextCommandTextarea.tsx
```

## Funktion

`TextCommandTextarea` ist ein wiederverwendbares Textfeld für große Eingabefelder. Es:

- erkennt Textbefehle über `findFirstTextCommand`,
- ergänzt einen einheitlichen Hinweistext zu verfügbaren Kürzeln,
- setzt `data-text-command-enabled="true"`,
- feuert ein globales Ereignis `gremia-sbv:text-command-detected`,
- kann zusätzlich einen lokalen `onTextCommand`-Handler aufrufen.

## Migrierte Textfelder

- Notiz-/Protokollinhalt
- nächste Schritte
- Maßnahmenbeschreibung
- Vorlagentexte
- Wissensdatenbank-Kommentare
- Rechtsprechungs-Kurzleitsätze
- Präventions-Textfelder
- Standardwerte-Signatur
- Lösch-/Anonymisierungsbegründung

## Wichtig

0.4.53 stellt die gemeinsame Infrastruktur bereit. Die fachlich vollständige Verarbeitung jedes Kürzels außerhalb der Fallakte erfolgt anschließend über modulbezogene Handler. Damit wird vermieden, dass Fallaktenlogik unkontrolliert in andere Module gezogen wird.
