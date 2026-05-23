# Known Issues Gremia.SBV

Stand: **0.9.2**

## Vor 1.0 zu prüfen

- Personenbindung der Fallakte ist tiefgreifend: Migration muss vorhandene `person_case_links` nutzen und Legacy-Fälle priorisieren.
- Anonyme Beratungsanfragen benötigen einen klaren Sonderstatus ohne Direktidentifikatoren.
- Audit-Hash-Kette darf keine Direktidentifikatoren enthalten; bestehende Einträge müssen vor Datenübernahme geprüft werden.
- Art.-15-Auskunftsexporte benötigen vor Herausgabe weiterhin einen organisatorisch geregelten Identitäts-, Drittdaten-, Schwärzungs- und Freigabeprozess.
- iCal-Export darf im Standard keine Namen, Diagnosen, Personalnummern oder Fallinhalte enthalten.
- Fallübergabe in Pilotnutzung besonders auf Fehlbedienung prüfen: Ablaufdatum, Passphrase-Handling, Zusammenführungsvorschläge und Audit ohne Personenbezug.

## Plattformen

- macOS-Artefakte sind im RC-Stand unsigniert und nicht notarisiert.
- Windows-Build ist als portable EXE vorgesehen; SmartScreen-Hinweise sind bei unsignierten Builds möglich.
- AppImage-Datenpfade sind in `APPIMAGE_DATA_PATHS.md` dokumentiert.

## Datenschutz

- Produktive Nutzung setzt organisatorische Freigabe durch verantwortliche Stelle, Datenschutzbeauftragte und IT-Security voraus.
- Die App informiert Beschäftigte nicht selbst nach Art. 13/14 DSGVO; dies ist organisatorisch sicherzustellen.
- Freitext-Anonymisierung erfolgt nicht vollautomatisch, sondern wird als Prüfpflicht markiert.
