# Known Issues für 0.9.1

Stand: 0.9.1

## Plattformen und Signierung

- Windows-Builds sind im RC unsigniert.
- macOS-Artefakte werden im GitHub-Workflow unsigniert und nicht notarisiert gebaut. macOS Gatekeeper kann Warnungen anzeigen oder den Start blockieren.
- Ein produktiv freigegebener macOS-Release benötigt Signierung und Notarisierung.

## Build-Toolchain

- `electron-builder` kann weiterhin den generischen Hinweis ausgeben, `"postinstall": "electron-builder install-app-deps"` zu ergänzen. Der Eintrag ist im Projekt verbindlich gesetzt; relevant ist, ob der native Rebuild tatsächlich läuft.
- `npm ci` kann transitive Deprecation-Warnungen aus Electron-/Native-Build-Werkzeugen ausgeben. Runtime-relevante High/Critical-Auditbefunde bleiben RC-blockierend.
- Der Windows-Build nutzt für den unsignierten RC `signAndEditExecutable: false`, um `winCodeSign`-/Symlink-Probleme auf normalen Windows-Umgebungen zu vermeiden.

## E2E und lokale Testumgebung

- E2E-Tests benötigen eine explizite lokale Playwright-Installation über `npm run test:e2e:setup`.
- E2E-Tests dürfen nur mit isoliertem temporärem Testdatenverzeichnis laufen.

## Bewusste Produktgrenzen

- Gremia.SBV ist offline-first und enthält bewusst keine Cloud-, Sync- oder Mehrbenutzerfunktion.
- Die App ersetzt keine Rechtsberatung, Datenschutzfreigabe oder organisatorische Entscheidung.
- Technische Statusanzeigen dürfen keine menschliche oder rechtliche Freigabeentscheidung simulieren.

## Technische Schulden nach RC

- `InlineCommandOverlays.tsx` und `useInlineCommands.ts` sind weiterhin groß und sollten nach RC weiter modularisiert werden.
- Große Services wie `caseService.ts`, `reportService.ts` und `templateService.ts` bleiben Post-RC-Kandidaten für weitere fachliche Aufteilung.
- Nach RC sind nur Bugfixes, Buildfixes, Security-Fixes, Datenverlust-/Migrationsfixes und Dokumentationskorrekturen zulässig.


## Build-Umgebung: Node 18 nicht unterstützt

Node.js 18 kann bei aktuellen Electron-/Vite-/Native-Dependencies `EBADENGINE`-Warnungen erzeugen und ist für den RC-Build nicht mehr freigegeben. Für lokale Builds, GitHub Actions und Release-Artefakte ist Node.js 20.19.0 oder neuer innerhalb der unterstützten LTS-/Current-Linien zu verwenden.

## npm Registry

Der Lockfile-Stand darf keine internen Registry- oder Artifactory-URLs enthalten. Der RC-Stand verwendet öffentliche `registry.npmjs.org`-URLs. Lokale npm-Konfigurationen wie alte `always-auth`-/`email`-Einträge können weiterhin Warnungen verursachen, sind aber außerhalb des Projekt-Repositories zu bereinigen.

## Nicht-blockierende Coverage-Grenzen

Die globalen Service-Dateien enthalten mehrere große datenbankgebundene Orchestrierungsservices. Eine pauschale Unit-Coverage über `services/**/*.ts` erzeugt kein sinnvolles Qualitätsbild, weil sie UI-nahe Datenbankadapter, Reportgeneratoren und breite Repository-Schichten als ungetestete Unit-Logik wertet. Für den RC misst das V8-Coverage-Gate deshalb die RC-kritischen Service-Verträge und Policy-Services.

Post-RC bleibt als technisches Thema bestehen: große Services weiter zerlegen, DB-Mapping defensiver typisieren und Integrationstests für die breiten Adapter ergänzen.
