# Gremia.SBV 0.5.1c – BEM-Button und Textcommand-Hinweise

## Problem

Nach Aktivierung des BEM-Moduls hatte der BEM-Button in der Fallakte zwar Funktion, aber noch die sekundäre Optik eines geplanten Moduls.

Außerdem zeigten BEM-Textfelder die globalen Kurzbefehle (`//`, `@@`, `##`, `§§`, `!!`, `>>`, `^^`, `~~`) an, obwohl die Inline-Overlays dort noch nicht fachlich angebunden waren. Das erzeugte eine falsche Bedienerwartung.

## Änderung

- BEM-Footerbutton nutzt jetzt `industrial-button` und `HeartPulse` wie ein aktives Fachmodul.
- `TextCommandTextarea` erhält `showCommandHint?: boolean`.
- BEM-Detailfelder setzen `showCommandHint={false}`.
- Im BEM-Detail steht ein klarer Hinweis, dass Kurzbefehle dort erst nach fachlicher Overlay-Anbindung sichtbar werden.

## Nächster sinnvoller Schritt

Wenn Kurzbefehle auch in BEM-Maßnahmentexten wirklich genutzt werden sollen, muss die Inline-Command-Logik von der Notiz-/Protokollbindung gelöst und als generischer Textfeld-Command-Controller bereitgestellt werden.
