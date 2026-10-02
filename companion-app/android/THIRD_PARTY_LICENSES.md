# Drittanbieter-Lizenzen der Android-Begleit-App

Die Android-Begleit-App ist ein eigener Build-Arbeitsbereich. Zusätzliche
Android-Abhängigkeiten werden hier dokumentiert, damit Lizenzentscheidungen
nicht in der Desktop-Abhängigkeitsliste untergehen.

## JSON-java (nur JVM-Tests)

- Artefakt: `org.json:json:20240303`
- Zweck: Reale JSON-Verarbeitung im Desktop–Android-Integrationstest statt Android-Teststubs.
- Lizenz: Public Domain; AGPL-3-kompatibel. Nicht Bestandteil der APK.
- Quelle: <https://github.com/stleary/JSON-java/wiki/The-JSON-Java-license>

## Bouncy Castle Java APIs

- Artefakt: `org.bouncycastle:bcprov-jdk18on`
- Version: `1.85.2`
- Zweck: X25519-Schlüsselerzeugung und ASN.1/SPKI-Kodierung für die mit
  Gremia.SBV Desktop kompatible Empfängerkennung.
- Lizenz: MIT-artige Bouncy-Castle-Lizenz; AGPL-3-kompatibel.
- Quelle: <https://www.bouncycastle.org/license.html>

## AndroidX Core

- Artefakte: `androidx.core:core-ktx`, `androidx.activity:activity-ktx`
- Versionen: `core-ktx 1.13.1`, `activity-ktx 1.9.3`
- Zweck: Sichere Bereitstellung lokal erzeugter Rückgabedateien über
  `FileProvider` sowie moderner Activity-Result-Vertrag für den QR-Scanner.
- Lizenz: Apache License 2.0; AGPL-3-kompatibel.
- Quelle: <https://developer.android.com/jetpack/androidx/releases/core>

## ZXing Android Embedded

- Artefakt: `com.journeyapps:zxing-android-embedded`
- Version: `4.3.0`
- Zweck: Kamera-gestützte Erfassung der QR-Frames aus Gremia.SBV Desktop.
- Lizenz: Apache License 2.0; AGPL-3-kompatibel.
- Quelle: <https://github.com/journeyapps/zxing-android-embedded>
