# Changelog

Alle relevanten Änderungen an Gremia.SBV werden in diesem Dokument zusammengefasst. Das Format orientiert sich an Keep a Changelog.

## [Öffentlicher Start] - geplant

### Added

- Offline-first SBV-Fallarbeit mit verschlüsseltem SQLCipher-Vault.
- Fallakten, Personen, Kontakte, Fristen und Wiedervorlagen.
- Prozessmodule für BEM, Prävention, Gleichstellung/GdB-nahe Begleitung, Kündigungsanhörung, SBV-Beteiligung und Arbeitsplatzanpassung.
- Datenschutzpfade für Löschung, Anonymisierung, Retention, Suchindex und Audit.
- Verschlüsselte Fallübergabe über `.gsbvtransfer`-Pakete.
- Compliance-Center mit Integritäts-, Datenschutz- und Art.-15-Unterstützung.
- Demo-Modus mit `--demo` und synthetischem Datenbestand.
- Vollständige Produkttour-E2E, Visual-QA, Core-UI-Flows und A11y-Vertragstests.
- Drittanbieter-Lizenzinventar und Public-Release-Qualitätsgate.

### Changed

- UI auf zentrale Workbench-, Panel-, Button-, Form-, Badge-, Dialog-, Listen- und Feedback-Komponenten konsolidiert.
- Große Feature-Monolithen refactored und in Hooks, Sektionen, Panels und Utility-Module aufgeteilt.
- README zuerst auf SBVen und erst danach auf Entwicklerinnen und Entwickler ausgerichtet.

### Security

- Electron-Härtung mit `contextIsolation`, deaktiviertem `nodeIntegration`, Sandbox und CSP.
- Audit-Ereignisse über zentrale Builder und datensparsame Metadaten.
- CI-Gate für `npm audit --audit-level=high` ergänzt.
- Root-`SECURITY.md` für vertrauliche Sicherheitsmeldungen ergänzt.
