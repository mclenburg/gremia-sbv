# Betriebsgrenzen und Prüfpunkte

Gremia.SBV ist eine lokale Fachanwendung für vertrauliche SBV-Arbeit. Die Anwendung unterstützt Datenschutz, Datensparsamkeit und strukturierte Fallarbeit, ersetzt aber keine organisatorische Freigabe und keine rechtliche Einzelfallprüfung.

## Fachliche Prüfpunkte

- Personenbindung der Fallakte ist bewusst zu prüfen, wenn beim Import, bei einer Übergabe oder bei einer Datenübernahme kein eindeutiger Personenbezug vorliegt.
- Anonyme Beratungsanfragen haben einen eigenen Sonderstatus ohne Direktidentifikatoren.
- Audit-Hash-Ketten dürfen keine Direktidentifikatoren enthalten.
- Art.-15-Auskunftsexporte sind Arbeitsentwürfe und benötigen vor Herausgabe einen organisatorisch geregelten Identitäts-, Drittdaten-, Schwärzungs- und Freigabeprozess.
- iCal-Export darf im Standard keine Namen, Diagnosen, Personalnummern oder Fallinhalte enthalten.
- Fallübergabe ist besonders sorgfältig zu nutzen: Ablaufdatum, Passphrase-Handling, Zusammenführungsvorschläge und Audit ohne Personenbezug sind vor Übergabe zu prüfen.

## Plattformen

- macOS-Artefakte können ohne Signatur und Notarisierung Betriebssystemwarnungen auslösen.
- Windows wird als portable EXE bereitgestellt; SmartScreen-Hinweise sind bei nicht signierten Builds möglich.
- Die Code-Signing-Strategie ist in `CODE_SIGNING.md` dokumentiert.
- AppImage-Datenpfade sind in `APPIMAGE_DATA_PATHS.md` dokumentiert.

## Datenschutz

- Produktive Nutzung setzt organisatorische Freigabe durch verantwortliche Stelle, Datenschutzbeauftragte und IT-Security voraus.
- Die App informiert Beschäftigte nicht selbst nach Art. 13/14 DSGVO; dies ist organisatorisch sicherzustellen.
- Freitext-Anonymisierung erfolgt nicht vollautomatisch, sondern wird als Prüfpflicht markiert.
- Exporte sind bewusste lokale Handlungen und müssen vor Weitergabe fachlich geprüft werden.
