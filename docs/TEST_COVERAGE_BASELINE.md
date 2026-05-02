# Test-Coverage-Baseline ab 0.3.41

Ab Version 0.3.41 gilt für Gremia.SBV die Projektregel:

> Jede neue fachliche oder sicherheitsrelevante Funktionalität wird mit passenden Tests ausgeliefert.

## Nachgezogene Testbereiche

Dieses Patch-Paket ergänzt Tests für bisher entstandene Kernrisiken:

- Fristen-Dashboardlogik einschließlich 48h-Regel
- Lösch- und Aufbewahrungslogik
- Kontakterkennung und Anonymisierungsgrundlagen
- Dokumentenspeicher-Policy
- Backup-Payload-Policy
- Berichtsanonymisierung und PDF-Theme-Regel
- Migration-Hilfslogik für defensive Datenbankanpassungen
- Prozess-Basisservices für BEM, Gleichstellung und Kündigungsanhörung
- Audit-Hash-Stabilität

## Testbefehle

Gesamttest:

```bash
npm run test
```

Gezielte Datenschutztests:

```bash
npm run test:privacy
```

Backup-Policy:

```bash
npm run test:backup
```

Migration-Hilfslogik:

```bash
npm run test:migrations
```

Releaseprüfung:

```bash
npm run release:check
```

## Testprinzipien

Die Tests prüfen bevorzugt reine Policy- und Fachlogik ohne native SQLCipher-Abhängigkeit. Native Integrations- und Smoke-Tests für AppImage/Windows bleiben ein eigener Ausbauschritt vor Version 1.0.

Für künftige Patches gilt:

1. Neue Fachlogik bekommt Unit-Tests.
2. Neue Sicherheitslogik bekommt Negativtests.
3. Neue Migrationen bekommen mindestens einen Migration-/Schema-Test.
4. Neue Exportfunktionen bekommen Datenschutz- und Pfadtests.
5. Neue UI-Arbeitsflüsse bekommen perspektivisch Playwright-Smoke-Tests.
