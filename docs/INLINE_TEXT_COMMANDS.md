# Inline-Kurzbefehle

Stand: **0.9.1**

## Zweck

Inline-Kurzbefehle beschleunigen die SBV-Dokumentation aus großen Textfeldern heraus.

## Abgedeckte Befehle

Die RC-kritischen Befehle sind vollständig abgedeckt:

```text
/bem, /praev, /bet, /kuend, /gleich, /anp, /fr
```

## Verhalten

- Kurzbefehle bleiben in großen Textfeldern aktiv.
- Der Scan folgt der bestehenden Ursprungserkennung.
- Performance wird nicht durch Datenbankspeicherung pro Tastendruck gelöst, sondern durch Lost-Focus-Speicherung der Maßnahmenfelder.
- Dialoge müssen barrierearm und per Tastatur bedienbar bleiben.

## Datenschutz

Kurzbefehle dürfen keine Diagnosen oder unnötigen Personendaten automatisch erzeugen. Bei Personenbezug ist die Fallakte beziehungsweise der Personenstamm führend.
