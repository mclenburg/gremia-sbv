# Gremia.SBV 0.4.25 – Statusgeführte Präventionsabschnitte und Dokumente

Dieser Patch ergänzt die Fallakten-Workbench um drei Punkte:

- Präventionsverfahren sind in fachliche Abschnitte geteilt, die passend zum Status sichtbar werden.
- Die Arbeitgeberreaktion wird erst angezeigt, wenn der Status mindestens `arbeitgeber_reagiert` erreicht hat. Dadurch kann sie nicht vor der Anforderung prominent gepflegt werden.
- Neben dem Badge `Maßnahme` gibt es den Link `Dokumente`. Er öffnet ein Overlay mit Präventionsvorlagen, die zur Maßnahmeart und zum aktuellen Status passen.

## Vorlagenbindung

Für statusbezogene Dokumente werden Präventionsvorlagen über Tags verbunden:

- `massnahme:prevention`
- `status:<status-key>`, z. B. `status:angefordert` oder `status:massnahmen_vereinbart`

Das Vorlagenformular enthält dafür ein neues Feld `Maßnahmenstatus`. Bei Präventionsvorlagen werden die passenden Tags automatisch ergänzt.

## Platzhalter

Beim Erzeugen aus einer Maßnahme werden neben den Fallplatzhaltern auch Prozessplatzhalter ersetzt, u. a.:

- `{{praevention.status}}`
- `{{praevention.gefaehrdung}}`
- `{{praevention.schwierigkeit}}`
- `{{praevention.risiko}}`
- `{{praevention.arbeitgeberfrist}}`
- `{{praevention.arbeitgeberreaktion}}`
- `{{praevention.massnahmen}}`
- `{{praevention.ergebnis}}`

Das erzeugte Dokument wird als TXT heruntergeladen und weiterhin im Vorlagenverlauf archiviert.
