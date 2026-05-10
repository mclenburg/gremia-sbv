# Release Notes – Gremia.SBV 0.9.1

Stand: **0.9.1**

`0.9.1` ist eine Vor-1.0-Ergänzung im RC-Zweig. Sie ergänzt das im Praxistest als fehlend erkannte Personenverzeichnis und zieht Datenschutz-Lifecycle, Import, Fristenintegration, iCal-Export und Compliance-Dokumentation nach.

## Neu

- Personenverzeichnis ohne GdB-Standardfeld und ohne Diagnosefelder.
- Personalnummer ist optional.
- CSV-/XLSX-Import mit Vorschau, Spaltenmapping, Validierung und Ergebnis.
- Vollnamen-Spalte mit `Nachname, Vorname` oder `Vorname Nachname`.
- Beschäftigungsstatus und Beschäftigungsende.
- Statusablaufwarnungen über das bestehende Fristensystem.
- Datenschutzprüfung bei Statusablauf, Beschäftigungsende, Anonymisierung oder Löschung.
- iCal-Export aus Fristen mit `process_type` als Standard.
- Compliance-Dokumente für Personenverzeichnis, Art. 13/14, Art. 15, § 164 Abs. 4 SGB IX und Audit-ohne-Direktidentifikatoren.

## Architekturkorrekturen

- Personenmodul wird modular geführt, nicht als View-Monolith.
- Feature-Handler gehören in Hooks, nicht in `App.tsx`.
- Matching, Lifecycle, Case-Linking und Anonymisierung werden über Services/Policies getrennt.
- Reguläre Fallakten sollen künftig personengebunden sein; anonyme Beratungsanfragen werden pseudonym geführt.

## Datenschutz

- Keine Namen, E-Mail-Adressen oder Personalnummern im Audit-Log.
- Keine Rohdateispeicherung beim Import.
- Keine automatische Freitextanonymisierung.
- Fortspeicherung personenbezogener Fallakten benötigt Grund und Prüftermin.
- Art. 13/14-Information ist organisatorisch sicherzustellen.

## Freeze

Nach Abschluss von 0.9.1 gilt bis 1.0: **keine neuen Fachfeatures**, **keine Cloud-Synchronisation**, keine Lizenzänderung weg von **AGPL-3.0-or-later**. Zulässig bleiben Security-Fixes, Datenverlust- und Migrationsfixes, Build-/Testfixes, offensichtliche UI-Bugs und Dokumentationskorrekturen.
