# Gremia.SBV Begleit-App

Dieser Arbeitsbereich enthält die Android-Begleit-App für mobile SBV-Arbeit.

Die Begleit-App ist keine zweite vollständige Gremia.SBV-Instanz. Sie erhält
zielgebundene mobile Arbeitsprojektionen aus der Desktop-Anwendung und gibt
nach Besprechungen nur die mobil erfassten Änderungen als verschlüsselte
Rückgabedatei zurück.

## Architekturgrenzen

- Die Desktop-Anwendung bleibt führender Tresor.
- Die App speichert keine vollständigen Fallakten, Dokumentdateien oder
  vertraulichen Desktop-Freitexte.
- Projektionen und Rückgaben sind zielgebunden und verschlüsselt.
- Es gibt keine Telemetrie und keine Cloudpflicht.
- Netzwerkzugriff ist nicht Teil des ersten App-Arbeitsbereichs.

## Struktur

- `android/` enthält den eigenständigen Android-Gradle-Build.
- `android/app/src/main/java/de/gremia/sbv/companion/` enthält die App-Shell.
- Die erste produktive App-Funktion erzeugt lokal eine X25519-Transferidentität,
  schützt den privaten Schlüssel mit dem Android Keystore und zeigt nur die
  öffentliche Empfängerkennung für die Kopplung mit Gremia.SBV Desktop an.
- QR-Frames aus der Desktop-Anwendung werden validiert, zusammengesetzt,
  zielinstanzgebunden entschlüsselt und geschützt auf dem Gerät abgelegt.
- Lokale Bearbeitung und verschlüsselte Rückgabe werden in den nächsten Slices
  getrennt nach Domäne, Transfer und UI ergänzt.
