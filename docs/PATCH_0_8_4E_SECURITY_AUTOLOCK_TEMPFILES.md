# Patch 0.8.4-e – Tresor-Härtung, Auto-Lock und temporäre Arbeitskopien

## Ziel

Patch 0.8.4-e härtet Gremia.SBV als lokalen SBV-Tresor. Der Patch reduziert die Electron-Angriffsfläche, sperrt die Anwendung automatisch nach Inaktivität und zentralisiert den Umgang mit temporären Klartext-Arbeitskopien.

## Änderungen

### Electron-Sicherheitsbaseline

- Hauptfenster läuft mit `sandbox: true`.
- Renderer-Navigation außerhalb der App wird blockiert.
- `window.open` wird zentral per `setWindowOpenHandler` unterbunden.
- Netzwerk-/Datei-Anfragen werden über eine zentrale Session-Policy geprüft.
- Eine Content-Security-Policy wird zentral gesetzt.
- Zusätzliche Sicherheitsheader: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.

Neue Datei:

- `electron/security/electronSecurity.ts`

### Auto-Lock

- Die App sperrt den Tresor nach 10 Minuten Inaktivität.
- Die Sperre wird im Audit-Log als Security-Ereignis hashverkettet protokolliert.
- Manuelle Sperre und Auto-Lock nutzen dieselbe zentrale Sperrlogik.

Neue Datei:

- `src/app/core/security/useAutoLock.ts`

### Temporäre Klartext-Arbeitskopien

- Zentraler `TempFileService` für kurzlebige Preview-/Report-Dateien.
- Temporäre Dokument- und Reportkopien werden bei App-Start, Lock und manueller Bereinigung gelöscht.
- HTML-Zwischendateien für PDF-Erzeugung liegen nicht mehr im Exportordner, sondern im zentralen tmp-Bereich.
- Einstellungen enthalten eine manuelle Aktion „Temporäre Dateien jetzt löschen“.
- Der System- und Integritätsbericht wertet temporäre Klartext-Arbeitskopien aus und warnt bei Restbeständen.

Neue Datei:

- `services/tempFileService.ts`

### Audit

Neue Security-Ereignisse werden in der bestehenden Audit-Hash-Chain als `security` protokolliert:

- Unlock per Passwort
- Unlock per Recovery-Key
- Lock / Auto-Lock
- manuelle Bereinigung temporärer Dateien

## Prüfung

Dieser Patch ergänzt den Test `tests/securityHardening084e.test.ts` und das Script:

```bash
npm run test:security-hardening-084e
```

Der Test prüft statisch die zentralen Sicherheitsentscheidungen: Sandbox, CSP, Navigation-Blocker, Auto-Lock-Konstante, zentrale Temp-Datei-Logik und Integritätsberichtsauswertung.
