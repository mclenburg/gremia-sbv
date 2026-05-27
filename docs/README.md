# Dokumentation

Diese Dokumentation beschreibt das Gesamtprodukt Gremia.SBV. Sie ist nicht als Sammlung einzelner Patchnotizen gedacht, sondern als dauerhafte Arbeits-, Betriebs-, Datenschutz- und Entwicklungsdokumentation für eine lokale Fachanwendung der Schwerbehindertenvertretung.

## Für wen ist diese Dokumentation gedacht?

Die wichtigste Zielgruppe sind Schwerbehindertenvertretungen und ihre Stellvertretungen. Die Texte sollen erklären, was die Anwendung fachlich leistet, welche Grenzen sie hat und worauf bei sensiblen SBV-Daten zu achten ist.

Zweite Zielgruppe sind Personen, die Gremia.SBV betreiben, prüfen oder weiterentwickeln: Datenschutz, IT-Sicherheit, Administration und Entwicklung.

## Einstieg

| Datei | Zweck |
| --- | --- |
| `../README.md` | öffentlicher Projekteinstieg und Produktüberblick |
| `CASE_PROCESS_WORKFLOW.md` | Fallaktenarbeit, Personenbindung, anonyme Beratung und Datenschutzprüfung |
| `PROCESS_MODULES.md` | Fachmodule, Maßnahmen und Fristen im SBV-Alltag |
| `CASE_HANDOVER_TRANSFER.md` | verschlüsselte Fallübergabe für Vertretung und Nachfolge |
| `PRIVACY_AND_SECURITY.md` | Schutzprinzipien, Vault, Audit, Suche und Datenflüsse |
| `DATENSCHUTZKONZEPT.md` | organisatorisches Datenschutzkonzept |
| `DSGVO_SBV.md` | DSGVO-Hinweise für SBV-Nutzung und Betroffenenrechte |
| `LOESCHKONZEPT_SBV.md` | Aufbewahrung, Löschung, Anonymisierung und Prüfpfade |
| `VERARBEITUNGSVERZEICHNIS_SBV.md` | Grundlage für das Verzeichnis der Verarbeitungstätigkeiten |
| `BACKUP_RESTORE.md` | Sicherung und Wiederherstellung des lokalen Vaults |
| `ROADMAP.md` | Produktstatus, Stabilisierung vor der Veröffentlichung und spätere Themen |

## Freigabeunterlagen für Datenschutz und IT-Security

| Datei | Zweck |
| --- | --- |
| `FREIGABE_DSB_IT_SECURITY.md` | zentraler Einstieg für Datenschutzbeauftragte, IT-Security und interne Freigabe |
| `DATENSCHUTZKONZEPT.md` | Datenschutzkonzept für Zweckbindung, Rollen, Datenminimierung und organisatorische Nutzung |
| `DSFA_SBV_TEMPLATE.md` | Vorlage für eine Datenschutz-Folgenabschätzung |
| `VERARBEITUNGSVERZEICHNIS_SBV.md` | Grundlage für das Verzeichnis der Verarbeitungstätigkeiten |
| `LOESCHKONZEPT_SBV.md` | Aufbewahrung, Löschung, Anonymisierung und Prüffälle |
| `PRIVACY_AND_SECURITY.md` | Datenschutz- und Sicherheitsprinzipien der Anwendung |
| `SECURITY.md` | technische Sicherheitsarchitektur |
| `CODE_SIGNING.md` | Strategie für nicht signierte und später signierte Build-Artefakte |
| `QUALITY_GATE.md` | verbindliche Qualitäts-, Test-, Security- und Accessibility-Gates |

## Betrieb, Architektur und Entwicklung

| Datei | Zweck |
| --- | --- |
| `ARCHITECTURE.md` | Architektur, Schichten, IPC und Modulgrenzen |
| `ARCHITECTURE_DIAGRAMS.md` | Mermaid-Diagramme für Datenflüsse und Komponenten |
| `SECURITY.md` | technische Sicherheitsgrundsätze |
| `DATABASE_ENCRYPTION.md` | SQLCipher-Vault und Verschlüsselungsentscheidungen |
| `DATABASE_MIGRATIONS.md` | Migrationen und Schema-Integrität |
| `BUILD.md` | Build, Tests und Release-Artefakte |
| `DEVELOPMENT.md` | Entwicklungsregeln, Clean Code und Tests |
| `E2E_TESTS.md` | Ende-zu-Ende-Tests und isolierte Testumgebung |
| `APP_VERSION_BUILD.md` | Versionsgenerierung |
| `NATIVE_SQLCIPHER_DEPENDENCY.md` | native SQLCipher-Abhängigkeit |
| `APPIMAGE_DATA_PATHS.md` | Datenpfade im AppImage-Betrieb |
| `WINDOWS_BUILD.md` | Windows-Build-Hinweise |

## Fachliche Dauerunterlagen

| Datei | Zweck |
| --- | --- |
| `INLINE_TEXT_COMMANDS.md` | Inline-Kurzbefehle in großen Textfeldern |
| `TEMPLATES_MODULE.md` | Vorlagenmodul |
| `KNOWLEDGE_BASE.md` | Wissensbasis |
| `REPORTS_PDF_EXPORT.md` | PDF- und Reportlogik |
| `SBV_STEUERUNG.md` | Nachweise für Schulung, Heranziehung, Sachmittel sowie Strukturkontrollen |
| `DSFA_SBV_TEMPLATE.md` | Vorlage für Datenschutz-Folgenabschätzung |
| `KNOWN_ISSUES.md` | bekannte Einschränkungen vor produktiver Freigabe |

## Dokumentationsregel

Neue Dokumentation soll dauerhaft verwendbar sein. Kurzlebige Patchnotizen, historische Buildfix-Protokolle, Release Notes, Change Logs und temporäre Hotfix-Dokumente gehören nicht in den aktiven Dokumentationsbestand.

Ein Dokument soll nicht erklären, warum ein bestimmter Patch entstanden ist. Es soll erklären, wie Gremia.SBV funktioniert, welche fachlichen Entscheidungen gelten und welche Pflichten die nutzende SBV beachten muss.
