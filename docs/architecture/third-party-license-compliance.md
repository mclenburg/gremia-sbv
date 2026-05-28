# Third-Party-License-Compliance

Gremia.SBV wird vor dem öffentlichen 1.0-Start mit vollständiger Drittanbieter-Lizenzdokumentation ausgeliefert.

## Generator

`npm run licenses:generate` lädt für jede in `package-lock.json` fixierte Paketversion die Metadaten aus der npm-Registry und wertet anschließend den zu dieser Version gehörenden npm-Tarball aus.

Der Generator erzeugt:

- `THIRD_PARTY_LICENSES.txt` als Inventar aller Node-/Electron-Abhängigkeiten,
- `THIRD_PARTY_NOTICES.txt` als zusammengeführte Copyright-/Notice-Übersicht,
- `LICENSES/<paket>@<version>/LICENSE.txt` mit dem jeweiligen Lizenztext,
- optional `LICENSES/<paket>@<version>/NOTICE.txt`, wenn der Upstream-Tarball Notice- oder Copyright-Dateien enthält,
- `LICENSES/<paket>@<version>/metadata.json` mit der gelesenen Lizenzexpression und Herkunftsmetadaten.

## Release-Regel

Nach jeder Dependency-Änderung muss `npm run licenses:generate` ausgeführt werden. Vor einem öffentlichen Release muss `npm run licenses:check` grün sein.

Das Check-Script blockiert insbesondere:

- fehlende Lizenztexte unter `LICENSES/`,
- fehlende `THIRD_PARTY_NOTICES.txt`,
- `UNKNOWN`-Lizenzplatzhalter,
- fehlende direkte Abhängigkeiten im Inventar,
- defekte Verweise aus dem Inventar auf Lizenzdateien.

## Netzwerkverhalten

Der Generator nutzt standardmäßig `https://registry.npmjs.org`. Für Tests oder kontrollierte Umgebungen kann `NPM_REGISTRY_URL` gesetzt werden. Die Zuordnung erfolgt immer gegen die konkrete Version aus dem Lockfile, nicht gegen `latest`.

## Umgang mit OR-Lizenzen

Bei SPDX-ähnlichen `OR`-Ausdrücken dokumentiert der Generator die vollständige Upstream-Lizenzexpression und markiert zusätzlich die gewählte permissive Lizenz, wenn eine eindeutig bevorzugte Alternative vorhanden ist, zum Beispiel `MIT` bei `MIT OR GPL-3.0-or-later`.
