# Patch 0.8.8-h.3 – robuste E2E-Selektoren und Theme-Prüfung

## Ziel

Der E2E-Lauf war bereits produktiv nutzbar, aber einzelne Tests waren noch zu stark an konkrete UI-Texte oder direkte Hintergrundfarben gebunden.

## Änderungen

- `e2e/app-smoke.spec.ts`
  - Keine harte Versionsnummer.
  - Fallaktenprüfung nutzt eindeutige Überschriften statt mehrdeutigem `getByText('TEST-0001')`.

- `e2e/compliance-theme.spec.ts`
  - Compliance-Heading wird über `getByRole('heading', ...)` geprüft.
  - Die Theme-Prüfung ermittelt eine effektive Hintergrundfarbe über Elterncontainer, wenn der Zielcontainer transparent ist.
  - `color(srgb ...)` wird beim Farbvergleich unterstützt.

## Datenschutz

Die Datenbankisolation des E2E-Runners bleibt unverändert. Tests laufen ausschließlich in temporären `gremia-sbv-e2e-*`-Verzeichnissen.
