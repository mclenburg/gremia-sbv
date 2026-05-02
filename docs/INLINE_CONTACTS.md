# Inline-Kontakte in Protokollen

Version: 0.3.29

## Ziel

Gesprächsnotizen und Protokolle können Kontakte direkt aus dem Text heraus referenzieren. Dadurch werden Ansprechpartner nicht nur im Kontaktregister gepflegt, sondern dort eingefügt, wo sie im SBV-Arbeitsfluss tatsächlich auftauchen.

## Bedienung

In den Feldern **Inhalt** und **Nächste Schritte** löst `@@` die Kontaktfunktion aus.

Ablauf:

1. `@@` im Protokolltext eingeben.
2. Overlay öffnet sich.
3. Bestehenden Kontakt auswählen oder neuen Kontakt erfassen.
4. Nach Auswahl bzw. Speicherung wird `@@` ersetzt durch:

```text
Name, Vorname (Firma)
```

Beispiel:

```text
Besprochen mit Müller, Thomas (Personalabteilung): Unterlagen werden bis Freitag nachgereicht.
```

## Kontaktregister

Das Modul **Kontakte** enthält ein erstes Register mit Suchfeld und Erfassungsmaske.

Gespeichert werden aktuell:

- Vorname
- Nachname
- Firma / Stelle
- Rolle
- Kategorie
- E-Mail
- Telefon

## Datenschutz und Arbeitslogik

Der Kontaktverweis im Protokoll ist bewusst lesbar und nicht technisch kryptisch. Die eigentlichen Kontaktinformationen liegen in der SQLCipher-Datenbank.

Der Text enthält keine interne UUID. Technische IDs bleiben aus der Oberfläche heraus.

## Abgrenzung

Dieses Paket fügt noch keine automatische technische Rückverknüpfung zwischen Kontakt und Protokoll an. Der Kontakt wird lesbar in den Text eingefügt. Eine spätere Erweiterung kann zusätzlich eine Relationstabelle für Kontakt-Erwähnungen anlegen.
