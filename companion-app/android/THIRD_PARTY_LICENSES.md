# Drittanbieter-Lizenzen der Android-Begleit-App

Die Android-Begleit-App ist ein eigener Build-Arbeitsbereich. Zusätzliche
Android-Abhängigkeiten werden hier dokumentiert, damit Lizenzentscheidungen
nicht in der Desktop-Abhängigkeitsliste untergehen.

## Bouncy Castle Java APIs

- Artefakt: `org.bouncycastle:bcprov-jdk18on`
- Version: `1.85.2`
- Zweck: X25519-Schlüsselerzeugung und ASN.1/SPKI-Kodierung für die mit
  Gremia.SBV Desktop kompatible Empfängerkennung.
- Lizenz: MIT-artige Bouncy-Castle-Lizenz; AGPL-3-kompatibel.
- Quelle: <https://www.bouncycastle.org/license.html>
