# Datenschutz-Folgenabschätzung – Vorlage Gremia.SBV

## 1. Verarbeitung

**Verarbeitungsaktivität:** Digitale Fallarbeit der Schwerbehindertenvertretung mit Gremia.SBV einschließlich Personenverzeichnis, Fallakten, Maßnahmen, Fristen, Dokumenten, Exporten und Compliance-Dokumentation.

**Zwecke:**

- Beratung und Unterstützung schwerbehinderter und gleichgestellter Beschäftigter,
- Dokumentation von SBV-Fallarbeit,
- Überwachung und Förderung nach § 178 Abs. 1 SGB IX,
- Beteiligung nach § 178 Abs. 2 Satz 1 SGB IX,
- behinderungsgerechte Beschäftigung und Arbeitsplatzgestaltung nach § 164 Abs. 4 SGB IX,
- Begleitung von Präventionsverfahren nach § 167 Abs. 1 SGB IX,
- Begleitung von BEM-Verfahren nach § 167 Abs. 2 SGB IX,
- Unterstützung bei Kündigungsschutz, Gleichstellung, GdB-Beratung und Arbeitsplatzanpassung,
- Statusablaufwarnung, Löschprüfung und Anonymisierung.

## 2. Datenarten

Gremia.SBV verarbeitet regelmäßig besondere Kategorien personenbezogener Daten, insbesondere Gesundheitsdaten und Angaben zur Schwerbehinderung oder Gleichstellung.

- Stammdaten,
- Kontaktdaten,
- Beschäftigungsdaten,
- Schutzstatus und Statusgültigkeit,
- Gesundheitsdaten, soweit erforderlich,
- GdB-/Gleichstellungsdaten im Beratungskontext, nicht als Personenverzeichnis-Standardfeld,
- ärztliche Unterlagen, soweit bewusst importiert,
- Gesprächsnotizen,
- Dokumente,
- Fristen,
- Maßnahmen,
- Kommunikationsdaten,
- Export- und Übergabedaten,
- Audit- und Sicherheitsdaten ohne Direktidentifikatoren.

## 3. Betroffene Personen

- schwerbehinderte Beschäftigte,
- gleichgestellte Beschäftigte,
- Antragstellende auf Gleichstellung oder GdB,
- ratsuchende Beschäftigte,
- pseudonyme anonyme Anfragen,
- Kontaktpersonen innerhalb und außerhalb des Unternehmens,
- Arbeitgeberkontakte,
- Betriebsratskontakte,
- Inklusionsamt / Integrationsamt / Agentur für Arbeit.

## 4. Rechtsgrundlagen

Zu prüfen und organisatorisch zu dokumentieren sind insbesondere:

- Art. 6 Abs. 1 lit. c DSGVO,
- Art. 9 Abs. 2 lit. b DSGVO,
- § 26 Abs. 3 BDSG,
- § 163 SGB IX,
- § 164 Abs. 4 SGB IX,
- § 178 Abs. 1 SGB IX,
- § 178 Abs. 2 Satz 1 SGB IX.

## 5. Notwendigkeit und Verhältnismäßigkeit

Die Verarbeitung ist auf das für die SBV-Aufgabe Erforderliche zu begrenzen.

Prüfpunkte:

- Ist die Personenerfassung erforderlich?
- Reicht Schutzstatus statt GdB?
- Ist eine anonyme Anfrage ausreichend?
- Sind Gesundheitsdetails wirklich erforderlich?
- Können Daten pseudonymisiert werden?
- Ist ein Dokumentenimport erforderlich oder reicht ein Vermerk?
- Ist ein Export erforderlich?
- Ist eine Übergabe vollständig oder nur teilweise erforderlich?

## 6. Risiken

| Risiko | Eintritt | Schwere | Bewertung | Maßnahmen |
|---|---:|---:|---:|---|
| unbefugte Akteneinsicht | mittel | hoch | hoch | SQLCipher, Passwort, keine Admin-Facheinsicht |
| Verlust portabler Datenbank | mittel | hoch | hoch | Verschlüsselung, Backup-Konzept, Incident-Prozess |
| falscher Exportempfänger | mittel | hoch | hoch | ExportGuard, Bestätigung, Exportprotokoll |
| zu lange Speicherung | mittel | mittel | mittel | Löschprüfung, Anonymisierung, Statusablaufwarnung |
| unkontrollierte Übergabedatei | mittel | hoch | hoch | selektiver Export, Ablaufdatum |
| fehlende Nachvollziehbarkeit | mittel | mittel | mittel | Audit-Log ohne Direktidentifikatoren, Löschprotokoll, Exportprotokoll |
| Re-Identifikation nach Anonymisierung | mittel | hoch | hoch | Freitextprüfung, PrivacyReviewItems, keine automatische Freitextanonymisierung |
| Audit-Log-Konflikt mit Art. 17 DSGVO | niedrig | hoch | mittel | Hash-Kette ohne Namen, E-Mail, Personalnummer |

## 7. Schutzmaßnahmen

Technisch:

- SQLCipher / verschlüsselte lokale Datenbank,
- verschlüsselte Backups,
- ExportGuard,
- passwortgeschützter Zugriff,
- keine Cloud-Synchronisation,
- keine Telemetrie,
- Audit-Hash-Kette ohne Direktidentifikatoren,
- iCal-Standardexport `process_type`,
- Import ohne dauerhafte Rohdateispeicherung.

Organisatorisch:

- Datenschutzinformation nach Art. 13/14 DSGVO durch verantwortliche Stelle,
- klare Zuständigkeiten für Art. 15-Auskunft,
- Lösch- und Anonymisierungsprüfung,
- regelmäßige Review-Fristen.
