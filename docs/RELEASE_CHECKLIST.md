# Release-Checkliste bis 0.9.0-rc.1

## Automatisierte Mindestprüfung

```bash
npm ci
npm run rc:check
npm run test
npm run build
npm run build:linux
```

Zusätzlich:

```bash
npm run source:cleanup:dry-run
npm run source:cleanup:verbose
npm run build:readiness
npm run build:readiness:strict
npm run test:documentation-088d
npm run test:release-candidate-088e
```

## Manuelle Abnahme

- frischen Tresor anlegen
- bestehende Datenbank migrieren
- Fallakte anlegen
- Notiz/Protokoll erfassen
- Maßnahme über Inlinebefehl anlegen
- Maßnahme manuell anlegen
- Frist mit Maßnahmebezug anlegen
- Dokument importieren und öffnen
- Vorlagen verwenden
- Berichte erzeugen
- Compliance-Dokumente erzeugen
- Backup erstellen
- Restore testen
- Auto-Lock testen
- Audit-Hash-Chain prüfen
- Manipulationserkennung testen
- temporäre Dateien bereinigen
- Responsivität bei kleiner Fensterbreite prüfen

## RC-Regel

Nach `0.9.0-rc.1` werden keine neuen Fachfunktionen mehr aufgenommen. Zulässig sind nur Fehlerkorrekturen, Sicherheitskorrekturen, Buildfixes, Doku-Korrekturen und kleine UI-Korrekturen ohne neue Fachlogik.
