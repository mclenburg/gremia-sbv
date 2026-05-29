# Freigabepaket für Datenschutzbeauftragte und IT-Security

Dieses Dokument bündelt die Unterlagen, die für eine Datenschutz- und IT-Security-Prüfung von Gremia.SBV relevant sind. Es ersetzt keine organisatorische Freigabeentscheidung, sondern dient als strukturierter Einstieg für Datenschutzbeauftragte, Informationssicherheit, IT-Betrieb und Schwerbehindertenvertretung.

## Ziel der Prüfung

Gremia.SBV ist eine lokale Desktop-Anwendung für die vertrauliche Arbeit der Schwerbehindertenvertretung. Die Anwendung verarbeitet Fallakten, Personenbezüge, Fristen, Prozessdaten, Dokumente und Nachweise, die regelmäßig einen Bezug zu Behinderung, Gesundheit, Prävention, BEM, Kündigungsschutz oder Arbeitsplatzgestaltung haben können.

Die Prüfung sollte insbesondere klären:

- ob die lokale Verarbeitung in der vorgesehenen Umgebung zulässig und angemessen abgesichert ist,
- ob die organisatorischen Datenschutzunterlagen vollständig sind,
- ob die technischen und organisatorischen Maßnahmen zum Schutz besonderer Kategorien personenbezogener Daten passen,
- ob Export-, Backup-, Übergabe- und Löschpfade verstanden und organisatorisch geregelt sind,
- ob die Software aus Sicht der IT-Sicherheit betrieben oder freigegeben werden kann.

## Datenschutzrelevante Unterlagen

| Unterlage | Zweck für die Freigabe |
| --- | --- |
| `DATENSCHUTZKONZEPT.md` | Datenschutzkonzept für Zweckbindung, Rollen, Datenminimierung und organisatorische Nutzung |
| `DSGVO_SBV.md` | Einordnung typischer DSGVO-Pflichten in der SBV-Arbeit |
| `DSFA_SBV_TEMPLATE.md` | Vorlage für eine Datenschutz-Folgenabschätzung |
| `VERARBEITUNGSVERZEICHNIS_SBV.md` | Grundlage für das Verzeichnis der Verarbeitungstätigkeiten |
| `LOESCHKONZEPT_SBV.md` | Aufbewahrung, Löschung, Anonymisierung und Prüffälle |
| `PRIVACY_AND_SECURITY.md` | Datenschutz- und Sicherheitsprinzipien der Anwendung |
| `CASE_HANDOVER_TRANSFER.md` | Zweckbindung und Schutz der verschlüsselten Fallübergabe |
| `BACKUP_RESTORE.md` | Sicherung und Wiederherstellung des verschlüsselten lokalen Vaults |

## IT-Security-relevante Unterlagen

| Unterlage | Zweck für die Freigabe |
| --- | --- |
| `SECURITY.md` | technische Sicherheitsarchitektur, Electron-Härtung, Vault, Audit und Datenflüsse |
| `ARCHITECTURE.md` | Schichtenmodell, IPC-Grenze, Renderer-Isolation und Modulgrenzen |
| `ARCHITECTURE_DIAGRAMS.md` | Architektur- und Datenflussdiagramme |
| `DATABASE_ENCRYPTION.md` | SQLCipher-Vault, Schlüsselableitung und Verschlüsselungsentscheidungen |
| `DATABASE_MIGRATIONS.md` | Schema- und Migrationsintegrität |
| `CODE_SIGNING.md` | Strategie für nicht signierte und später signierte Build-Artefakte |
| `LICENSE_POLICY.md` | Lizenzrahmen und Drittanbieter-Lizenzinventar |
| `QUALITY_GATE.md` | verbindliche Qualitäts-, Test-, A11y-, Security- und Qualitätsgates |
| `BETRIEBSGRENZEN.md` | Betriebsgrenzen, Prüfpunkte und transparente Betriebsrisiken |

## Wesentliche Datenschutzentscheidungen

- Gremia.SBV arbeitet offline-first und ohne Cloudzwang.
- Der normale Betrieb erfordert keine Telemetrie und keine verdeckten Hintergrundverbindungen.
- Die lokale Datenbank ist verschlüsselt.
- Exporte, Backups und Übergaben sind bewusste Nutzeraktionen.
- Audit-Einträge enthalten keine Namen, E-Mail-Adressen, Personalnummern oder Freitextinhalte.
- Suchindex, Anhänge, Löschung, Anonymisierung und Retention werden gemeinsam betrachtet.
- Demo-Daten sind synthetisch und dürfen nicht mit echten SBV-Daten verwechselt werden.

## Wesentliche Sicherheitsentscheidungen

- Der Renderer erhält keinen direkten Zugriff auf Node, Electron, Datenbank oder Dateisystem.
- Die Kommunikation läuft über typisierte Bridge- und IPC-Grenzen.
- Electron ist gehärtet durch Kontextisolation, deaktivierte Node-Integration, Sandbox und Content-Security-Policy.
- Pfad- und Dateizugriffe werden im Main-/Service-Layer validiert.
- SQLCipher schützt den lokalen Vault.
- Bekannte hohe und kritische Dependency-Schwachstellen blockieren den öffentlichen Build-Prozess.
- Drittanbieter-Lizenzen werden als Inventar mitgeführt.

## Prüffragen für Datenschutzbeauftragte

- Ist die SBV organisatorisch berechtigt, die vorgesehenen Daten lokal zu verarbeiten?
- Ist geklärt, wer Zugriff auf das Gerät, den Vault, Backups und Exporte hat?
- Sind Löschfristen, Anonymisierung und Fortspeicherung organisatorisch abgestimmt?
- Ist geregelt, wie Auskunftsersuchen, Drittdatenprüfung und Schwärzung vor Herausgabe behandelt werden?
- Ist die Nutzung von Demo-Daten von produktiven Daten sauber getrennt?
- Sind Fallübergaben, Vertreterzugriffe und Amtswechsel organisatorisch beschrieben?

## Prüffragen für IT-Security

- Entspricht die lokale Installation den Vorgaben des Unternehmens für Desktop-Anwendungen?
- Ist der Umgang mit nicht signierten Artefakten für den öffentlichen Start akzeptiert und dokumentiert?
- Ist der Downloadweg auf das offizielle Repository beschränkt?
- Sind Backups, Exportordner und temporäre Dateien in das lokale Sicherheitskonzept einbezogen?
- Sind Betriebssystemverschlüsselung, Benutzerkonten, Bildschirmsperre und Dateisicherung geregelt?
- Sind Dependency-Scanning, Lizenzinventar und Security-Disclosure-Prozess akzeptiert?

## Mindestunterlagen für eine Freigabeakte

Für eine interne Freigabeakte sollten mindestens folgende Dokumente geprüft oder übernommen werden:

- dieses Freigabepaket,
- Datenschutzkonzept,
- Datenschutz-Folgenabschätzung oder begründete Entscheidung zur Erforderlichkeit,
- Verzeichnis der Verarbeitungstätigkeiten,
- Löschkonzept,
- Datenschutz- und Sicherheitskonzept,
- technische Sicherheitsdokumentation,
- Architekturübersicht,
- Backup-/Restore-Konzept,
- Code-Signing-Strategie,
- Lizenzinventar,
- bekannte Einschränkungen,
- Qualitätsfreigabe-Checkliste.

## Abgrenzung

Gremia.SBV ersetzt keine rechtliche Beratung, keine organisatorische Datenschutzfreigabe und kein formales Penetration-Testat. Die Software stellt technische und dokumentarische Grundlagen bereit; die konkrete Freigabe bleibt Aufgabe der verantwortlichen Organisation.
