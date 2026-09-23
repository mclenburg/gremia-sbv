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
- Die App erzeugt lokal eine X25519-Transferidentität, schützt den privaten
  Schlüssel mit dem Android Keystore und koppelt sich über eine
  Desktop-Pairinganfrage, eine App-Pairingantwort und einen beidseitig
  zu vergleichenden Sicherheitscode.
- QR-Frames aus der Desktop-Anwendung werden validiert, zusammengesetzt,
  auf den Herkunftsnachweis des bestätigt gekoppelten Desktops geprüft,
  zielinstanzgebunden entschlüsselt und geschützt auf dem Gerät abgelegt.
  Anfrage-QR, `.gsbvpair`-Dateien und Texteingabe dienen der Kopplung.
  Die App speichert die Desktop-Vertrauensbeziehung erst nach ausdrücklicher
  Bestätigung; Abbruch, Sperre und Timeout verwerfen nur den offenen Dialog.
  Der Herkunftsnachweis verwendet X25519, zweckgebundenes HKDF-SHA-256 und
  HMAC-SHA-256 über AAD-Hash, Ciphertext-Hash und GCM-Tag. Er ersetzt weder
  die bestehende Zielverschlüsselung noch die beidseitige Codeprüfung.
- Mobile Notizen, mobile Wiedervorlagen und Fristerledigungen werden lokal
  verschlüsselt vorgemerkt und als `.gsbvmobile` zielgebunden für die
  Desktop-Instanz gespeichert. Auch die Rückgabe trägt einen Herkunftsnachweis
  des Mobilgeräts; dessen aktiver Kopplungsschlüssel wird am Desktop vor
  Vorschau und Import geprüft. Die Schlüsselableitung trennt Hin- und Rückweg.
  Ältere Rückgabedateien ohne Nachweis werden nicht importiert: App aktualisieren
  und aus den erhalten gebliebenen Entwürfen eine neue Rückgabedatei erzeugen.
- Die Arbeitsbereiche **Start**, **Fristen**, **Erfassen**, **Synchronisation**
  und **Einstellungen** trennen Überblick, mobile Arbeit und technische
  Übertragung klar voneinander.
- Der Startbereich zeigt fällige Arbeit, offene Folgeschritte, ungesendete
  Änderungen sowie den letzten Im- und Export. Fristen lassen sich filtern und
  mit einer optionalen Abschlussnotiz erledigen.
- Die App übernimmt Hell- oder Dunkeldarstellung aus der mobilen Projektion.
  Displayschutz, automatische Sperre und die gezielte Löschung des mobilen
  Arbeitsbestands bleiben lokal konfigurierbar.
- Der technische Synchronisationsverlauf wird verschlüsselt gespeichert. Eine
  neue Projektion ersetzt keinen Arbeitsbestand, solange ungesendete mobile
  Änderungen vorhanden sind.

## Android-Build und Release-Signierung

Im Android-Arbeitsverzeichnis führt `./gradlew testDebugUnitTest lintDebug assembleDebug`
die lokalen Prüfungen aus und erzeugt `app/build/outputs/apk/debug/app-debug.apk`.
Unter Windows wird `gradlew.bat` verwendet. Der versionierte Wrapper nutzt
Gradle 9.3.0 mit festgelegter SHA-256-Prüfsumme der Distribution.

Die JVM-Tests enthalten einen echten Desktop–Android-Rundlauf: Kotlin erzeugt
die Kopplungsantwort, liest Desktop-QR-Frames und verschlüsselt eine Rückgabe.
Der Desktop prüft und importiert diese in eine frisch migrierte Testdatenbank.
Dafür müssen Node 24 im `PATH` und die npm-Abhängigkeiten des Projekt-Roots
installiert sein; `npm run native:rebuild:node` bereitet bei einem vorherigen
Electron-Build das native Datenbankmodul vor. Es werden ausschließlich
synthetische Daten und flüchtige Testschlüssel verwendet, kein laufender Tresor.
Dieser Integrationstest ersetzt keine Geräte-, Kamera- oder Screenreaderprüfung.

Für installierbare Releases benötigt das Projekt einen dauerhaft aufbewahrten,
privaten Signing-Key. Der Schlüssel und seine Passwörter gehören nicht ins
Repository. Die nicht versionierte Datei `android/keystore.properties` enthält
`STORE_FILE`, `STORE_PASSWORD`, `KEY_ALIAS` und `KEY_PASSWORD`. Relative
Schlüsselpfade beziehen sich auf das Android-Arbeitsverzeichnis. Alternativ
werden diese vier Werte als Umgebungsvariablen mit Präfix `GREMIA_ANDROID_`
aus geschützten CI-Secrets bereitgestellt; diese haben Vorrang.

`./gradlew releaseChecksum` baut die optimierte, signierte Release-APK unter
`app/build/outputs/apk/release/app-release.apk` und die zugehörige Datei
`app-release.apk.sha256`. Ohne vollständige Signierung bricht der Release-Build
mit einer konkreten Fehlermeldung ab. Debug-Builds benötigen keinen Release-Key.
Updates benötigen denselben Signing-Key und einen erhöhten `versionCode`;
der Schlüssel muss daher außerhalb des Repositorys gesichert werden.
