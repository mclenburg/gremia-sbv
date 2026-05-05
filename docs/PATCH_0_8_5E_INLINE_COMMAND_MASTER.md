# Patch 0.8.5-e – Zentraler Inline-Command-Master

Dieser Patch vereinheitlicht das vorhandene Inline-Overlay als Live-Erfassungssystem für die Fallakte.

## Ziel

Die Fallakte bleibt der einzige Ort für personenbezogene fachliche SBV-Arbeit. Kurzbefehle im Live-Protokoll lösen strukturierte Aktionen aus, ohne den Gesprächsfluss zu verlassen.

## Zentrale Command-Registry

Die Kurzbefehle werden jetzt zentral in `services/textCommandPolicy.ts` beschrieben. Neben den bisherigen Symbolbefehlen gibt es sprechende Aliasse:

- `//`, `/fr`, `/frist` – Frist
- `/wv`, `/wiedervorlage` – Wiedervorlage
- `@@`, `/kontakt` – Kontakt
- `##`, `/fall` – Fallbezug
- `§§`, `/norm` – Rechtsnorm
- `!!`, `/risiko` – Risiko
- `>>`, `/todo`, `/aufgabe` – offene Aufgabe
- `^^`, `/vertr`, `/vertraulich` – Vertraulichkeit
- `~~`, `/anon`, `/anonym` – Anonymisierung
- `/bet`, `/beteiligung` – SBV-Beteiligung als Fallaktenmaßnahme
- `/vl`, `/vorlage` – Vorlagenbezug vormerken

## SBV-Beteiligung per `/bet`

`/bet` erzeugt aus dem Live-Protokoll heraus eine SBV-Beteiligung als Maßnahme der aktuellen Fallakte. Die Schnellerfassung ist bewusst kurz gehalten:

- Titel,
- Arbeitgebermaßnahme / Kurznotiz,
- Risikostufe,
- optionale Stellungnahmefrist,
- nächster Schritt.

Details werden nach dem Gespräch im Maßnahmenbereich der Fallakte ergänzt.

## Vorlagen per `/vl`

`/vl` merkt einen Vorlagenbezug im Protokoll vor. Die konkrete Dokumenterzeugung bleibt vorerst im Vorlagenmodul. Dadurch wird die Live-Erfassung beschleunigt, ohne vorschnell Klartextdokumente zu erzeugen.

## Kompatibilität

Die bisherigen Kürzel `//`, `@@`, `##`, `§§`, `!!`, `>>`, `^^` und `~~` bleiben erhalten. Die neue Registry ist die Grundlage für die spätere vollständige Overlay-Vereinheitlichung und für `/anp` bei der Arbeitsplatzgestaltung.
