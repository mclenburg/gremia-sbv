# Gremia.SBV 0.9.1 – Personenverzeichnis, Import und Datenschutz-Lifecycle

0.9.1 ist eine Vor-1.0-Ergänzung, weil im RC-Test ein fachlicher Grundbaustein fehlte: die datensparsame Liste der schwerbehinderten und gleichgestellten Personen.

## Neu

- Personenverzeichnis ohne GdB-Standardfeld und ohne Diagnosefelder.
- Optionales Beschäftigungsende über `employmentState` und `leftCompanyAt`.
- CSV-/XLSX-Import als barrierearmer Import-Assistent mit Datei-/CSV-Quelle, Vorschau, Spaltenmapping, Prüfung und Ergebnisanzeige.
- Personalnummer ist optional; sicherer Abgleich ersatzweise über dienstliche E-Mail.
- Vor- und Nachname können getrennt oder als Vollnamen-Spalte importiert werden, auch im Format `Nachname, Vorname`.
- Importprotokoll ohne Rohdaten mit `person_import_run_items`.
- Statusablauf erzeugt Fristen im bestehenden Deadline-System, keine parallele Dashboard-Logik.
- 30-Tage-Warnung für auslaufende Statusnachweise.
- Datenschutzprüfung bei abgelaufenem Status.
- Strukturierte Anonymisierung entfernt direkte Identifikatoren und markiert Personen-Fallakten-Links als `person_anonymized`.
- Manueller iCal-Export für Fristen mit datenschutzfreundlichem Standard ohne Namen, Diagnosen und Fallinhalte.

## Datenschutz und Compliance

- DSFA, TOMs und VVT berücksichtigen Personenverzeichnis, Import, Statusablauf, Anonymisierung, iCal-Export und Art. 13/14-DSGVO-Organisationshinweis.
- Rechtsgrundlage: Art. 6 Abs. 1 lit. c DSGVO, Art. 9 Abs. 2 lit. b DSGVO, § 26 Abs. 3 BDSG, § 163 SGB IX und § 178 Abs. 1 sowie Abs. 2 Satz 1 SGB IX.
- SQLCipher bleibt Schutzmaßnahme für strukturierte Personenstammdaten; keine zusätzliche Feldverschlüsselung für Namen in 0.9.1, weil Suchbarkeit und Importabgleich erforderlich sind.


## Regressionen aus dem RC-Zweig

- Der fehlschlagende Maßnahmen-Test war zu grob formuliert und wurde auf echte Textfelder begrenzt.
- Die Inline-Kommando-Erkennung bleibt bei `findFirstTextCommand(event.target.value)`.
- Maßnahmen-Textfelder persistieren lange Freitexte über `onBlur`, nicht pro Tastendruck.
- Windows baut wieder eine portable Direktstart-EXE statt eines Installers.

## Freeze-Hinweis Richtung 1.0

Nach 0.9.1 sollen bis 1.0 nur noch Security-Fixes, Datenverlust-Risiken, Test-/Buildstabilisierung und Dokumentationskorrekturen erfolgen. keine neuen Fachfeatures, keine Cloud-Synchronisation. Lizenz: AGPL-3.0-or-later.
