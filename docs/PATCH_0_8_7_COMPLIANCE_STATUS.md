# Patch 0.8.7 – Datenschutzstatus und 1.0-Compliance-Vorbereitung

## Ziel

Dieser Patch bereitet Gremia.SBV auf die Release-Candidate-Phase vor. Das Compliance Center zeigt nun einen kompakten Datenschutzstatus und enthält zusätzliche Dokumente für die Produktivfreigabe.

## Änderungen

- Version auf `0.8.7` angehoben.
- Compliance Center um einen Statusbereich erweitert.
- Technische Signale werden angezeigt:
  - Tresor eingerichtet / geschützt,
  - aktueller Schutzstatus,
  - Auto-Lock-Hinweis,
  - temporäre Arbeitskopien,
  - Audit-Hash-Chain-Prüfung über Integritätsbericht,
  - Backup-/Restore-Nachweis,
  - TOM/VVT/DSFA-Freigabe.
- Neue Compliance-Dokumente:
  - Datenschutzstatus vor Produktivnutzung,
  - 1.0-Release-Checkliste.

## Wichtige Produktentscheidung

Die App formuliert bewusst keine automatische Aussage „DSGVO-konform“. Sie unterstützt die technische und organisatorische Prüfung. Die Freigabe bleibt eine Entscheidung der verantwortlichen Stelle, Datenschutzbeauftragten und IT-Security.

## Test

```bash
npm run test:compliance-status-087
```
