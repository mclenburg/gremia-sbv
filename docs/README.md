# Dokumentation

Stand: **0.9.1**

Diese Dokumentation ist der aktive, dauerhafte Dokumentationsbestand von Gremia.SBV. Historische Patch- und Buildfix-Notizen werden nicht mehr als Einzeldateien gepflegt, sondern im `CHANGELOG.md` zusammengefasst. Obsolete RC-Release-Notes werden durch `npm run source:cleanup` beziehungsweise `npm run cleanup:obsolete-release-notes` entfernt.

## Einstieg

| Datei | Zweck |
| --- | --- |
| `../README.md` | öffentlicher Projekteinstieg |
| `ARCHITECTURE.md` | Architektur, Datenfluss und Modulgrenzen |
| `DEVELOPMENT.md` | Entwicklung, Tests, Build und Clean-Code-Regeln |
| `RELEASE_CHECKLIST.md` | Abnahme vor `0.9.1` / 1.0-Freeze |
| `BUILD.md` | Build, Plattformmatrix und GitHub-Release-Workflow |
| `CHANGELOG.md` | zusammengefasste Entwicklungshistorie |
| `ROADMAP.md` | Versionspfad bis 1.0 und spätere 1.x-Themen |
| `KNOWN_ISSUES.md` | bekannte Einschränkungen für RC-Abnahme und Release Notes |
| `RELEASE_NOTES_0.9.1.md` | Release Notes zur aktuellen Vor-1.0-Ergänzung |

## Datenschutz und Compliance

| Datei | Zweck |
| --- | --- |
| `SECURITY.md` | technische Sicherheitsgrundsätze |
| `DATENSCHUTZKONZEPT.md` | organisatorisches Datenschutzkonzept |
| `DSGVO_SBV.md` | DSGVO-/SBV-spezifische Hinweise |
| `DSFA_SBV_TEMPLATE.md` | Vorlage für Datenschutz-Folgenabschätzung |
| `VERARBEITUNGSVERZEICHNIS_SBV.md` | VVT-Grundlage |
| `LOESCHKONZEPT_SBV.md` | Aufbewahrung, Löschung und Anonymisierung |
| `BACKUP_RESTORE.md` | Sicherung und Wiederherstellung |

## Betrieb und Build

| Datei | Zweck |
| --- | --- |
| `APP_VERSION_BUILD.md` | Versionsgenerierung |
| `DATABASE_MIGRATIONS.md` | Datenbankmigrationen |
| `DATABASE_ENCRYPTION.md` | verschlüsselte Datenbank |
| `NATIVE_SQLCIPHER_DEPENDENCY.md` | native SQLite-/SQLCipher-Abhängigkeit |
| `APPIMAGE_DATA_PATHS.md` | Datenpfade im AppImage-Betrieb |
| `WINDOWS_BUILD.md` | Windows-Build-Hinweise |
| `E2E_TESTS.md` | E2E-Setup, isolierte Testdaten und RC-kritische Flüsse |

## Fachliche Dauerunterlagen

| Datei | Zweck |
| --- | --- |
| `PROCESS_MODULES.md` | Prozessmodule, Maßnahmenlogik und Fallaktenbezug |
| `CASE_PROCESS_WORKFLOW.md` | Fallakten-Workflow, Personenbindung und anonyme Anfrage |
| `INLINE_TEXT_COMMANDS.md` | Inline-Kurzbefehle |
| `TEMPLATES_MODULE.md` | Vorlagenmodul |
| `KNOWLEDGE_BASE.md` | Wissensbasis |
| `REPORTS_PDF_EXPORT.md` | PDF- und Reportlogik |

## Regel

Neue Dokumentation soll dauerhaft verwendbar sein. Kurzlebige Patchnotizen, historische Buildfix-Protokolle und temporäre Hotfix-Dokumente gehören nicht in den aktiven Dokumentationsbestand. Detailthemen werden nur behalten, wenn sie für Betrieb, Datenschutz, Security, Migration, Entwicklung oder RC-Abnahme dauerhaft erforderlich sind.
