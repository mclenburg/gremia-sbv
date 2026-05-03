# Gremia.SBV 0.4.58a – DSGVO-Doku/Testfix

## Problem

Nach 0.4.58 blieben vier Testfehler:

1. `DSFA_SBV_TEMPLATE.md` enthielt nicht wortgleich `besondere Kategorien`.
2. `DSGVO_SBV.md` enthielt den Satz zur technischen Administration nicht in der vom Test erwarteten Kleinschreibung.
3. `exportPrivacyGuard0457.test.ts` erwartete weiterhin eine konkrete interne ConfirmDialog-Implementierung.
4. `README.md` enthielt nicht den aktuellen Stand.

## Änderung

- DSFA-Doku um die exakte Formulierung `besondere Kategorien personenbezogener Daten` ergänzt.
- DSGVO-Doku um den Merksatz `technische Administration darf grundsätzlich keine Fallakteninhalte lesen` ergänzt.
- ConfirmDialog-Test auf zugängliches Dialoggerüst und Promise-Resolve reduziert.
- README auf `Stand: 0.4.58a` aktualisiert.

Anwendungscode wurde nicht geändert.
