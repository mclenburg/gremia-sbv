# Changelog

## 0.8.8-g

- Playwright-basierte E2E-Smoke-Testbasis ergänzt.
- E2E-Runner erzeugt pro Lauf eine eigene temporäre Testumgebung und setzt `GREMIA_SBV_DATA_DIR` ausschließlich auf dieses Verzeichnis.
- Schutzabbruch eingebaut, falls ein E2E-Datenverzeichnis nicht unter dem System-Temp mit Präfix `gremia-sbv-e2e-` liegt.
- Browser-E2E-Tests nutzen synthetische Bridge-Daten statt produktiver SBV-Daten.
- Smoke-Tests für App-Start, Fallakte, Kurzbefehls-Hilfe und Compliance-Farbschema ergänzt.
- Containerlauf über `Dockerfile.e2e` vorbereitet.

## 0.8.8-f

- Compliance Center trennt technische Statusprüfung von organisatorischen Datenschutz-Prüfpunkten.
- Gesamtampel für Datenschutzstatus entfernt.
- Dark-/Lightmode-Styles des Compliance-Statusbereichs korrigiert.

## 0.8.8-d

- README zu einer GitHub-tauglichen Projekt-README umgebaut.
- Dokumentationsbestand geprüft und historische Patch-/Buildfix-Notizen aus dem aktiven Bestand entfernt.
- `docs/README.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `RELEASE_CHECKLIST.md` und `DOCUMENTATION_AUDIT_0_8_8_D.md` ergänzt.
- Source-Cleanup-Ausgabe korrigiert: bereits entfernte Dateien werden nicht mehr als „nicht vorhanden“, sondern als „bereits bereinigt“ behandelt.
- Die lange Test-Cleanup-Liste aus 0.8.8-c wurde durch ein leeres Abschlussmanifest ersetzt, um wiederholte Build-Ausgaben zu beruhigen.

## 0.8.8

- Build-Readiness-Guard ergänzt.
- `postinstall` mit `electron-builder install-app-deps` ergänzt.
- Native Electron-Abhängigkeiten werden nach Installation passend eingerichtet.

## 0.8.7

- Datenschutzstatus und 1.0-Compliance-Vorbereitung im Compliance Center ergänzt.
- Source-Cleanup-Mechanismus eingeführt.

## 0.8.6

- Arbeitsplatzgestaltung als Fallaktenmaßnahme ergänzt.
- Inlinebefehle vereinheitlicht.
- Maßnahmenbezogene Fristen und Dokumente vorbereitet.

## 0.8.5

- Fallaktenzentrierte Maßnahmenarchitektur eingeführt.
- SBV-Beteiligung aus dem isolierten Modul in die Fallakte überführt.
- Berichtswesen und Vorlagenlayout konsolidiert.

## 0.8.4

- Versionen, Schema, PDF-Erzeugung, Audit-Hash-Chain, Auto-Lock, temporäre Dateien und IPC-Validierung stabilisiert.
