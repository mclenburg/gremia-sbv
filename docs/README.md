# Dokumentation

Diese Dokumentation beschreibt das Gesamtprodukt Gremia.SBV. Sie ist als dauerhafte Arbeits-, Betriebs-, Datenschutz- und Entwicklungsdokumentation für eine lokale Fachanwendung der Schwerbehindertenvertretung gedacht.

Die README im Projektstamm erklärt Nutzen, Demo-Modus und Grundprinzipien aus Anwendersicht. Technische Details, Sicherheitsentscheidungen und Prüfunterlagen liegen hier unter `docs/`.

## Für wen ist diese Dokumentation gedacht?

Die wichtigste Zielgruppe sind Schwerbehindertenvertretungen und ihre Stellvertretungen. Die Texte sollen erklären, was die Anwendung fachlich leistet, welche Grenzen sie hat und worauf bei sensiblen SBV-Daten zu achten ist.

Zweite Zielgruppe sind Personen, die Gremia.SBV betreiben, prüfen oder weiterentwickeln: Datenschutz, IT-Sicherheit, Administration und Entwicklung.

## Einstieg für Anwenderinnen und Anwender

| Datei | Zweck |
| --- | --- |
| `../README.md` | öffentlicher Projekteinstieg und Produktüberblick |
| `handbuch/README.md` | Benutzerhandbuch für die tägliche SBV-Arbeit |
| `CASE_PROCESS_WORKFLOW.md` | Fallaktenarbeit, Personenbindung, anonyme Beratung und Datenschutzprüfung |
| `PROCESS_MODULES.md` | Fachmodule, Maßnahmen und Fristen im SBV-Alltag |
| `CASE_HANDOVER_TRANSFER.md` | verschlüsselte Fallübergabe für Vertretung und Nachfolge |
| `PRIVACY_AND_SECURITY.md` | Schutzprinzipien, Vault, Audit, Suche und Datenflüsse |
| `BACKUP_RESTORE.md` | lokale Sicherung und Wiederherstellung |
| `REPORTS_PDF_EXPORT.md` | Berichte und PDF-Ausgaben |
| `TEMPLATES_MODULE.md` | Vorlagen, Platzhalter und datensparsame Schreiben |
| `KNOWLEDGE_BASE.md` | Wissensbasis und fachliche Hinweise |
| `SBV_STEUERUNG.md` | SBV-Steuerung, Tätigkeitsbericht und Strukturarbeit |
| `BETRIEBSGRENZEN.md` | Betriebsgrenzen und Prüfpunkte vor produktiver Nutzung |

## Datenschutz, Sicherheit und Freigabe

| Datei | Zweck |
| --- | --- |
| `DATENSCHUTZKONZEPT.md` | Datenschutzkonzept für die SBV-Nutzung |
| `DSFA_SBV_TEMPLATE.md` | Vorlage für eine Datenschutz-Folgenabschätzung |
| `DSGVO_SBV.md` | DSGVO-Einordnung für SBV-Daten |
| `VERARBEITUNGSVERZEICHNIS_SBV.md` | Vorlage für das Verzeichnis von Verarbeitungstätigkeiten |
| `DATENSCHUTZINFORMATION_ART_13_14_TEMPLATE.md` | Vorlage für die Datenschutzinformation an betroffene Beschäftigte |
| `LOESCHKONZEPT_SBV.md` | Lösch- und Retention-Konzept |
| `FREIGABE_DSB_IT_SECURITY.md` | Freigabeunterlagen für Datenschutz und IT-Security |
| `SECURITY.md` | technische Sicherheitslinie |
| `PRIVACY_AND_SECURITY.md` | Datenschutz- und Sicherheitsarchitektur |
| `ACCESSIBILITY.md` | Barrierefreiheit und bedienbare Sicherheit |
| `DATABASE_ENCRYPTION.md` | lokale Datenbankverschlüsselung |
| `CODE_SIGNING.md` | Signaturstrategie für bereitgestellte Artefakte |
| `LICENSE_POLICY.md` | Lizenz- und Drittkomponentenlinie |

## Technische Dokumentation

| Datei | Zweck |
| --- | --- |
| `ARCHITECTURE.md` | Architektur, Schichten, IPC und Modulgrenzen |
| `ARCHITECTURE_DIAGRAMS.md` | Architektur- und Datenflussdiagramme |
| `DATABASE_MIGRATIONS.md` | Datenbankschema und Migrationen |
| `NATIVE_SQLCIPHER_DEPENDENCY.md` | native SQLCipher-kompatible Abhängigkeit |
| `BUILD.md` | Build, Tests und Artefakte |
| `WINDOWS_BUILD.md` | portable Windows-Artefakte |
| `APPIMAGE_DATA_PATHS.md` | Datenpfade bei AppImage-Nutzung |
| `DEVELOPMENT.md` | Entwicklungsumgebung und lokale Arbeit |
| `E2E_TESTS.md` | End-to-End-Tests |
| `QUALITY_GATE.md` | verbindliche Qualitätsprüfungen |
| `UI_VISUAL_QA.md` | visuelle UI-QA |
| `UI_CORE_BEHAVIOR_QA.md` | Bedienfluss-QA |
| `INLINE_TEXT_COMMANDS.md` | Textkommandos in Notiz- und Vorlagenfeldern |

## Gremia.BR-Lesebrücke

Die Lesebrücke ist optional, standardmäßig deaktiviert und ausschließlich lesend. Es gibt keine Hintergrundsynchronisation, keine automatische Übernahme von BR-Dokumenten und kein Rückschreiben von SBV-Daten.

Details stehen unter [`gremia-br/`](gremia-br/README.md).

## Dokumentationsregel

Neue Dokumentation soll dauerhaft verwendbar sein. Sie erklärt, wie Gremia.SBV funktioniert, welche fachlichen Entscheidungen gelten und welche Pflichten die nutzende SBV beachten muss.

Nicht in die aktive Dokumentation gehören:

- kurzlebige Umsetzungsnotizen,
- historische Arbeitsstände,
- temporäre Fehlerbehebungsprotokolle,
- fortlaufende Änderungshistorien,
- manuell gepflegte Produktversionsstände.

Technische Versionsinformationen werden aus den dafür vorgesehenen Projektdateien erzeugt. Die Dokumentation beschreibt den aktuellen Produktzustand und die geltende Architektur, nicht die Entstehungsgeschichte.
