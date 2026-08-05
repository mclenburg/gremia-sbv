# Funktionale Testlücken und Verhaltensabdeckung

Dieser Patch ersetzt keine fachlichen Tests durch Quelltextsuche. Er ergänzt ausführbare Positiv-, Negativ- und Grenzfalltests für zuvor nicht direkt importierte produktive Module.

Abgedeckt werden:

- Recruiting-Validierung: gültige und ungültige Daten, sichere Defaults, Statuswerte, Mengen- und Datenschutzgrenzen.
- Temporäre Dateien: Layout, Dateinamenshärtung, Dateirechte, Status, sofortiges und altersabhängiges Cleanup.
- Demo-Modus: Aktivierung, Isolation im Temp-Verzeichnis und idempotentes Zurücksetzen.
- Person-Fall-Verknüpfungen: Anlage, Wiederholungsidempotenz und selektive Anonymisierung aktiver Links.
- Portables Profil: sichere Standardpfade, einmalige Initialisierung und unveränderte Wiederverwendung bestehender Profile.

Die Module sind zusätzlich in die V8-Coverage-Auswahl aufgenommen. Dadurch scheitert der Release-Check künftig, wenn diese Verhaltenspfade nicht mehr ausreichend ausgeführt werden.

Der Patch behauptet keine mathematisch vollständige Abdeckung sämtlicher Softwarezustände. Er schließt die konkret ermittelten, releasekritischen Testlücken und verschärft deren automatisierte Absicherung.
