# Sicherheitskonzept Gremia.SBV

## Ziel

Gremia.SBV verarbeitet hochsensible Informationen aus der SBV-Arbeit. Dazu können Gesundheitsdaten, Angaben zu Schwerbehinderung, Gleichstellung, BEM, Kündigungen, Konflikten, Arbeitsplatzanpassungen und anwaltlichen Verfahren gehören.

Die Anwendung ist daher so zu gestalten, dass Vertraulichkeit, Integrität, Datensparsamkeit und lokale Kontrolle technisch unterstützt werden.

## Grundregeln

1. Keine Cloud-Synchronisierung.
2. Keine Telemetrie.
3. Keine externen Fonts/CDNs.
4. Keine automatischen Netzwerkzugriffe.
5. Keine Arbeitgeber- oder BR-Benutzerkonten.
6. Keine automatische Weitergabe an Gremia.BR.
7. Export nur bewusst und protokolliert.

## Verschlüsselung

### Datenbank

Die lokale Datenbank soll SQLCipher-kompatibel verschlüsselt werden.

Vorgesehener Adapter im Startgerüst:

```ts
import Database from 'better-sqlite3-multiple-ciphers';
```

Initialisierungsidee:

```ts
db.pragma("cipher='sqlcipher'");
db.pragma(`key = "x'${keyHex}'"`);
db.pragma('cipher_compatibility = 4');
```

Die konkrete Plattformintegration muss beim ersten lauffähigen Prototyp geprüft werden, insbesondere für Windows mit Electron-Packaging.

### Passwort und Master-Key

Das Benutzerpasswort darf nicht direkt als Datenbankschlüssel verwendet werden.

Empfohlenes Modell:

```text
Benutzerpasswort
  -> Argon2id oder scrypt
  -> Key Encryption Key
  -> entschlüsselt lokalen Master Key
  -> Master Key öffnet Datenbank und Dokumente
```

Vorteil: Passwortwechsel ist möglich, ohne alle Falldaten neu verschlüsseln zu müssen.

## Dokumente

Dokumente werden nicht unverschlüsselt im Dateisystem abgelegt. Vorgesehen ist:

```text
appData/gremia-sbv/documents/<document-id>.enc
```

Metadaten liegen in der Datenbank, Inhalte verschlüsselt im Dokumentenspeicher.

## Automatische Sperre

Die Anwendung soll nach konfigurierbarer Inaktivität sperren. Standardvorschlag:

```text
10 Minuten
```

Beim Sperren werden Schlüssel aus dem Arbeitsspeicher entfernt, soweit technisch möglich.

## Audit-Log

Das Audit-Log ist append-only und verkettet Einträge über Hashes.

Zu protokollieren sind insbesondere:

- Login / Unlock
- Fall geöffnet
- Fall deanonymisiert
- Dokument geöffnet
- Dokument exportiert
- Frist geändert
- Backup erstellt
- Daten gelöscht
- Bericht exportiert

## Backup

Backups werden ausschließlich verschlüsselt erstellt.

Dateiendungsvorschlag:

```text
.gsbv-backup
```

Ein Backup enthält:

- verschlüsselte Datenbank
- verschlüsselte Dokumente
- Manifest
- Prüfsummen
- Versionsinformation


## Entsperrschutz ab 0.8.9

Nach falschen Tresorpasswörtern wird der nächste Entsperrversuch verzögert:

- ab 3 Fehlversuchen: 30 Sekunden Pause,
- ab 5 Fehlversuchen: 60 Sekunden Pause,
- ab 7 Fehlversuchen: 5 Minuten Pause.

Es gibt keinen permanenten Lockout. Ein erfolgreicher Unlock setzt den Zähler zurück. Die Fehlversuchsdaten werden nur im Arbeitsspeicher der laufenden App-Instanz gehalten; ein App-Neustart darf den Zähler zurücksetzen. Passwortfragmente oder Klartextpasswörter werden nicht persistiert.

## Backup-KDF ab 0.8.9

Backups sind eine primäre Offline-Angriffsfläche, weil eine Angreiferin das Backup außerhalb der laufenden App beliebig oft gegen Passwortkandidaten prüfen könnte. Neue Backups verwenden deshalb dieselben gehärteten scrypt-Parameter wie der aktuelle Tresorstandard: scrypt N=131072, r=8, p=1, maxmem=256 MiB.

Die verwendeten KDF-Parameter werden im Backup-Envelope als technische Metadaten gespeichert. Legacy-Backups ohne `kdfParams` bleiben wiederherstellbar; für sie wird der frühere Fallback scrypt N=32768, r=8, p=1 verwendet.

## Amtsende / Übergabe

Für Amtsende oder Vertretungsfälle braucht die Anwendung später einen gesonderten Übergabemodus:

- Export nur verschlüsselt
- Übergabeprotokoll
- dokumentierte Entsperrung
- keine automatische Freigabe aller Altakten an Stellvertretungen

## Offene technische Prüfungen

- finale Wahl des SQLCipher-Adapters
- Electron-Packaging mit nativen Modulen unter Windows
- Schlüsselverwaltung im RAM
- sichere Löschbarkeit auf SSDs realistisch bewerten
- Signierung von Releases

## RC-Readiness 0.8.13

Für den RC wird Security nicht als nachgelagerte Dokumentation behandelt, sondern als Build- und Testvertrag:

- Vault- und Backup-KDF müssen geprüft bleiben.
- Unlock-Delay darf keinen permanenten Lockout erzeugen.
- Fehlversuchszähler dürfen nicht persistiert werden.
- Audit-Logs dürfen keine sensiblen Freitexte aufnehmen.
- Exporte sollen fachliche Labels statt unnötiger technischer UUIDs nutzen.
- E2E-Tests müssen ausschließlich isolierte temporäre Datenverzeichnisse verwenden.
- Native Electron-Abhängigkeiten werden über `postinstall: electron-builder install-app-deps` passend zur Electron-Version vorbereitet.

