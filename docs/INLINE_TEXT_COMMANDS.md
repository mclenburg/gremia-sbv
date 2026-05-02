# Inline-Textbefehle in Protokollen

Gremia.SBV unterstützt strukturierte Befehle direkt in Gesprächsnotizen und Protokollen. Die Befehle werden beim Tippen erkannt und über ein Overlay weitergeführt.

| Befehl | Zweck |
|---|---|
| `//` | Frist mit Datum anlegen |
| `@@` | Kontakt auswählen oder neu erfassen |
| `##` | weiteren Fallbezug verknüpfen |
| `§§` | Rechtsnorm aus der Normliste einfügen |
| `!!` | Risiko/Warnung markieren |
| `>>` | offene Aufgabe ohne konkretes Datum anlegen |
| `^^` | Vertraulichkeitsstufe der Notiz anheben |
| `~~` | Textstelle für spätere Anonymisierung vormerken |

## Datenschutzlogik

Kontaktbezüge bleiben weiterhin über die Kontakterkennung und `@@` verknüpfbar. Fallbezüge über `##` erweitern die Mehrfach-Fallzuordnung der Notiz. Die Anonymisierungsvormerkung `~~` ersetzt Inhalte nicht sofort, sondern setzt eine sichtbare Markierung, die später in Berichten und Anonymisierungsläufen ausgewertet werden kann.

## Offene Aufgaben ohne Datum

`>>` erzeugt eine Wiedervorlage ohne fachlich konkretes Ablaufdatum. Technisch wird ein weit entferntes Platzhalterdatum verwendet, damit die bestehende Fristenstruktur nicht aufgebrochen wird. Die Aufgabe wird trotzdem sofort auf dem Dashboard sichtbar gemacht.

## Rechtsnormen

`§§` nutzt eine erste kuratierte Normliste aus SGB IX, BetrVG, AGG und KSchG. Diese Liste ist die Grundlage für das spätere Wissensdatenbank-Modul.
