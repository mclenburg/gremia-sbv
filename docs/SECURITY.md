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
