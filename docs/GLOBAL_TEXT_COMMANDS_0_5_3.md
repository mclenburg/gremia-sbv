# Gremia.SBV 0.5.3 – globale Inline-Befehle für Textfelder

## Ziel

Alle `TextCommandTextarea`-Felder sollen die angezeigten Kurzbefehle auch tatsächlich ausführen können.

## Umsetzung

- `GlobalTextCommandController` wird zentral in `App.tsx` gemountet.
- `TextCommandTextarea` sendet bei erkannten Tokens ein globales Event.
- Der Controller öffnet das passende Overlay.
- Das Overlay ersetzt den Marker im ursprünglichen Textfeld über `gremia-sbv:text-command-replace`.
- Fall- und Kontaktlisten werden aus dem App-Kontext bereitgestellt.
- Rechtsnormen kommen aus den vorhandenen `LEGAL_NORM_SUGGESTIONS`.

## Unterstützte Tokens

```text
// Fristtext einfügen
@@ Kontakt einfügen
## Fallbezug einfügen
§§ Rechtsnorm einfügen
!! Risiko markieren
>> Aufgabe einfügen
^^ Vertraulichkeit markieren
~~ Anonymisierung vormerken
```

## Abgrenzung

Die bestehende Notiz-/Protokoll-Logik bleibt für `CaseNoteModal` erhalten. Dort sind die Inline-Befehle tiefer mit Fallbezügen, Fristen und Rechtsnormverknüpfung verdrahtet. Deshalb setzt `CaseNoteModal` `globalCommandsEnabled={false}` und nutzt weiterhin seine lokale Logik.

Alle übrigen Textfelder nutzen den globalen Controller.
