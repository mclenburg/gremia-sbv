# Datenschutz-Folgenabschätzung – Vorlage Gremia.SBV

Stand: 0.4.58

## 1. Verarbeitung

**Verarbeitungsaktivität:** Digitale Fallarbeit der Schwerbehindertenvertretung mit Gremia.SBV.

**Zwecke:**

- Beratung und Unterstützung schwerbehinderter und gleichgestellter Beschäftigter,
- Dokumentation von SBV-Fallarbeit,
- Überwachung und Förderung nach § 178 Abs. 1 SGB IX,
- Begleitung von Präventionsverfahren nach § 167 Abs. 1 SGB IX,
- Begleitung von BEM-Verfahren nach § 167 Abs. 2 SGB IX,
- Unterstützung bei Kündigungsschutz, Gleichstellung, GdB und Arbeitsplatzanpassung.

## 2. Datenarten

Gremia.SBV verarbeitet regelmäßig besondere Kategorien personenbezogener Daten, insbesondere Gesundheitsdaten und Angaben zur Schwerbehinderung oder Gleichstellung.

- Stammdaten,
- Kontaktdaten,
- Beschäftigungsdaten,
- Gesundheitsdaten,
- GdB-/Gleichstellungsdaten,
- ärztliche Unterlagen,
- Gesprächsnotizen,
- Dokumente,
- Fristen,
- Maßnahmen,
- Kommunikationsdaten,
- Export- und Übergabedaten,
- Audit- und Sicherheitsdaten.

## 3. Betroffene Personen

- schwerbehinderte Beschäftigte,
- gleichgestellte Beschäftigte,
- Antragstellende auf Gleichstellung oder GdB,
- ratsuchende Beschäftigte,
- Kontaktpersonen innerhalb und außerhalb des Unternehmens,
- Arbeitgeberkontakte,
- Betriebsratskontakte,
- Inklusionsamt / Integrationsamt / Agentur für Arbeit.

## 4. Notwendigkeit und Verhältnismäßigkeit

Die Verarbeitung muss auf das für die SBV-Aufgabe Erforderliche begrenzt bleiben.

Prüfpunkte:

- Ist die Fallakte erforderlich?
- Sind Gesundheitsdetails wirklich erforderlich?
- Können Daten pseudonymisiert werden?
- Ist ein Dokumentenimport erforderlich oder reicht ein Vermerk?
- Ist ein Export erforderlich?
- Ist eine Übergabe vollständig oder nur teilweise erforderlich?

## 5. Risiken

| Risiko | Eintritt | Schwere | Bewertung | Maßnahmen |
|---|---:|---:|---:|---|
| unbefugte Akteneinsicht | mittel | hoch | hoch | SQLCipher, Passwort, keine Admin-Facheinsicht |
| Verlust portabler Datenbank | mittel | hoch | hoch | Verschlüsselung, Backup-Konzept, Incident-Prozess |
| falscher Exportempfänger | mittel | hoch | hoch | ExportGuard, Bestätigung, Exportprotokoll |
| zu lange Speicherung | mittel | mittel | mittel | Löschprüfung, Anonymisierung, Fristen |
| unkontrollierte Vertretungsübergabe | mittel | hoch | hoch | selektiver Übergabeexport, Ablaufdatum |
| fehlende Nachvollziehbarkeit | mittel | mittel | mittel | Audit-Log, Löschprotokoll, Exportprotokoll |

## 6. Schutzmaßnahmen

Technisch:

- SQLCipher / verschlüsselte lokale Datenbank,
- verschlüsselte Backups,
- ExportGuard,
- passwortgeschützter Zugriff,
- keine Cloud-Synchronisation ohne bewusste Erweiterung,
- keine Telemetrie,
- verschlüsselte Übergabedateien,
- Audit-Logs für sicherheitsrelevante Vorgänge.

Organisatorisch:

- klare SBV-Verantwortlichkeit,
- Rollen- und Vertretungskonzept,
- Datenschutzunterweisung,
- Lösch- und Anonymisierungsprüfung,
- dokumentierte Export- und Übergabegründe,
- Incident-Prozess bei Datenschutzverletzungen.

## 7. Restrisiko

Das Restrisiko bleibt wegen der Sensibilität der Daten erhöht. Die Verarbeitung kann dennoch vertretbar sein, wenn Verschlüsselung, Zugriffsbeschränkung, Exportkontrolle, Löschprüfung und Vertretungskonzept umgesetzt und organisatorisch angewendet werden.

## 8. Entscheidung

- [ ] freigegeben
- [ ] freigegeben mit Auflagen
- [ ] nicht freigegeben

**Auflagen:**  
[Eintragen]

**Nächste Überprüfung:**  
[Datum]
