# Gremia.SBV 0.4.38 – Accessible Confirm Dialogs und Live-Regions

## Ziel
Native `window.confirm`-Dialoge wurden durch einen eigenen Industrial-Dialog ersetzt. Statusmeldungen können zusätzlich über zentrale Live-Regions an Screenreader gemeldet werden.

## Änderungen
- `ConfirmDialogProvider`
- `useConfirmDialog()`
- `LiveRegionProvider`
- `useAnnouncer()`
- `confirmDialog.css`
- `accessibilityLiveRegion.css`

## Ersetzt
- ExportGuard-Bestätigungen
- Kontaktlöschung
- Vorlagenlöschung
- Kopieren sensibler Vorlagenentwürfe

## Barrierefreiheit
- `role="alertdialog"`
- `aria-modal`
- `aria-labelledby`
- `aria-describedby`
- Escape schließt
- einfache Fokusfalle
- zentrale Live-Regions:
  - polite/status
  - assertive/alert
