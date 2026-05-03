# Gremia.SBV 0.4.57c – letzte Testannahmen korrigiert

## Problem

Nach 0.4.57b blieben zwei Testfehler:

1. `exportPrivacyGuard0457.test.ts` erwartete wörtlich `resolve(false)` und `resolve(true)`, obwohl der ConfirmDialog die Promise-Auflösung inzwischen anders kapselt.
2. `knowledgeWorkbenchAdvisor.test.ts` erwartete wörtlich `term.every`, obwohl die Volltextsuche nicht an diesen Implementierungsnamen gebunden sein sollte.

## Änderung

- ConfirmDialog-Test prüft weiter auf zugängliches Dialoggerüst, Design-System-Backdrop, Promise-Resolve und Schließen des Pending-Dialogs.
- Knowledge-Test prüft weiter auf Volltextsuch-Input und die relevanten Suchfelder, aber nicht mehr auf den konkreten lokalen Variablennamen `term.every`.

Anwendungscode wurde nicht geändert.
