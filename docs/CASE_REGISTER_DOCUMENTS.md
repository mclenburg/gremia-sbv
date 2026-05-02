# Gremia.SBV 0.3.17 – Fallregister, Explorer und Dokumentablage

## Fachliche Änderung

Das vom Benutzer vergebene Aktenzeichen ist ab 0.3.17 das führende Aktenzeichen der Fallakte. Gremia.SBV erzeugt keine zusätzliche sprechlose Bezeichnung wie `SBV-2026-0001` mehr.

## Fallregister

Die Fallverwaltung besteht nun aus drei Ebenen:

1. Filterbare, paginierte Fallliste oben
2. Fall-Explorer links mit Notizen/Protokollen und Dokumenten
3. Detail- und Suchbereich rechts

## Dokumentablage

Dokumente werden über den nativen Dateidialog importiert. Die Originaldatei wird nicht einfach kopiert, sondern als AES-256-GCM-verschlüsselte `.gsbvdoc`-Datei unter `data/documents/<caseId>/` abgelegt. Der Dokumentenschlüssel liegt in der SQLCipher-Datenbank und ist damit nur nach erfolgreichem Öffnen des Tresors verfügbar.

## Volltextsuche

Die Suche läuft über FTS-Tabellen für Notizen/Protokolle und Dokumente. Für Textdateien wird der Inhalt direkt indexiert. Für DOCX/XLSX wird der XML-Inhalt best-effort aus dem ZIP-Container gelesen. Für PDF wird eine einfache best-effort-Extraktion genutzt. Schwierige Scans oder verschlüsselte PDFs benötigen später OCR bzw. spezialisierte Parser.
