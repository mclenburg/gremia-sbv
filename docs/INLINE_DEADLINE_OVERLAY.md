# Inline-Fristen per Overlay

Stand: 0.3.20

## Zweck

In Gesprächsnotizen und Protokollen kann `//` als Arbeitsbefehl genutzt werden. Der Marker öffnet ein Overlay zur Fristenerfassung.

## Verhalten

1. Die SBV tippt `//` im Feld **Inhalt** oder **Nächste Schritte**.
2. Gremia.SBV öffnet ein Popup-Overlay.
3. Dort werden Fristtitel, Ablaufdatum, Stufe, Rechtsbezug und Notiz erfasst.
4. Nach dem Speichern wird die Frist mit dem aktuell ausgewählten Fall verknüpft.
5. Der Textmarker `//` wird im Protokoll ersetzt durch einen lesbaren Hinweis, zum Beispiel:

```text
Frist bis 18.05.2026, 10:00: Antwort Arbeitgeber nachhalten
```

## Fachregel

Inline-Fristen aus Protokollen sind immer fallbezogen. Ohne ausgewählte Fallakte wird keine Frist angelegt.

## Abbruch

Wird das Overlay abgebrochen, wird nur der `//`-Marker entfernt. Es entsteht keine Frist.
