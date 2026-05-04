# Patch 0.8.4-d – Audit-Hash-Chain und Integritätsauswertung

## Ziel

Dieser Patch härtet die Nachvollziehbarkeit personenbezogener Zugriffe und Änderungen. Das bestehende personenbezogene Audit-Log wird zu einer zentral geprüften Hash-Chain ausgebaut, sodass Manipulationen, Lücken und rechnerisch veränderte Einträge im System- und Integritätsbericht sichtbar werden.

## Technische Änderungen

- Neue zentrale Datei `services/auditHashChain.ts`.
- Einheitliche stabile Serialisierung über `stableStringify()`.
- Zentrale Hashberechnung über `computeAuditEntryHash()`.
- Kompatibilitätsprüfung für bereits vorhandene 0.8.4/0.8.4a-c-Audit-Einträge über `computeLegacyAuditEntryHash()`, damit bestehende Einträge nicht fälschlich als manipuliert erscheinen.
- Zentrale Prüfung über `verifyAuditHashChain()`.
- Prüfung erkennt insbesondere:
  - Sequenzlücken,
  - nicht passende `previous_hash`-Verweise,
  - rechnerisch nicht mehr passende `entry_hash`-Werte,
  - formal ungültige Hashwerte.
- `PersonalDataAuditLogService` nutzt die zentrale Hash-Chain-Logik.
- `PersonalDataAuditLogService.integritySummary()` liefert eine kompakte Auswertung für Berichte.
- Zusätzlicher Index `idx_personal_data_audit_sequence` für schnelle Integritätsprüfungen.

## Berichtsauswertung

Der System- und Integritätsbericht enthält jetzt einen eigenen Abschnitt **Audit-Log und Hash-Chain** mit:

- Status der Hash-Chain,
- Anzahl geprüfter Einträge,
- Lese-/Such-/Öffnungsereignissen,
- Änderungsereignissen,
- Export-/Backupereignissen,
- letztem Audit-Hash,
- Detailbefunden bei Manipulationsverdacht.

Auffälligkeiten erzeugen eine rote Warnung im Bericht.

## Erweiterte Protokollierung

Zusätzlich werden jetzt auch folgende personenbezogene Vorgänge in die Hash-Chain aufgenommen:

- PDF-Report-Erzeugung als verschlüsselter `.gsbvpdf`-Container,
- Fristenliste anzeigen,
- Fristendetail anzeigen,
- Frist personenbezogen anlegen,
- Frist personenbezogen ändern.

## Datenschutzbewertung

Das Audit-Log speichert keine vollständigen Inhalte der Fallakten, sondern Metadaten zu Zugriffen und Änderungen. Dadurch wird Nachvollziehbarkeit hergestellt, ohne die Schutzbedürftigkeit durch unnötige Inhaltsdubletten zu erhöhen.

## Grenzen

Die Hash-Chain erkennt nachträgliche Veränderungen innerhalb des lokalen Datenbestands. Sie ersetzt keine externe revisionssichere Archivierung. Wer vollständigen Zugriff auf die entschlüsselte Datenbank und die Anwendung hat, kann theoretisch auch eine vollständig neue Kette erzeugen. Für Version 1.x wäre optional ein externer Chain-Anker denkbar, z. B. ein periodisch exportierter letzter Hash.
