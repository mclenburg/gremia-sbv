# Dokumentation

Diese Dokumentation ist ab 0.8.8-d auf dauerhafte Projektunterlagen ausgerichtet. Historische Patch- und Buildfix-Notizen wurden aus dem aktiven Dokumentationsbestand entfernt und durch zusammenfassende Dokumente ersetzt.

## Zentrale Dokumente

| Datei | Zweck |
| --- | --- |
| `ARCHITECTURE.md` | Architektur, Datenfluss und Modulgrenzen |
| `DEVELOPMENT.md` | Entwicklung, Tests, Build und Source-Cleanup |
| `RELEASE_CHECKLIST.md` | Abnahme vor `0.9.0-rc.1-p` |
| `BUILD.md` | Build, Plattformmatrix und GitHub-Release-Workflow |
| `CHANGELOG.md` | zusammengefasste Entwicklungshistorie |
| `ROADMAP.md` | Versionspfad bis RC und spätere 1.x-Themen |
| `KNOWN_ISSUES.md` | bekannte Einschränkungen für RC-Abnahme und Release Notes |
| `RELEASE_NOTES_0.9.0-rc.1-p.md` | Release Notes zum ersten Release Candidate |

## Datenschutz und Compliance

| Datei | Zweck |
| --- | --- |
| `SECURITY.md` | technische Sicherheitsgrundsätze |
| `DATENSCHUTZKONZEPT.md` | organisatorisches Datenschutzkonzept |
| `DSGVO_SBV.md` | DSGVO-/SBV-spezifische Hinweise |
| `DSFA_SBV_TEMPLATE.md` | Vorlage für Datenschutz-Folgenabschätzung |
| `VERARBEITUNGSVERZEICHNIS_SBV.md` | VVT-Grundlage |
| `LOESCHKONZEPT_SBV.md` | Aufbewahrung und Löschung |
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
| `CASE_PROCESS_WORKFLOW.md` | Fallakten-Workflow |
| `INLINE_TEXT_COMMANDS.md` | Inline-Kurzbefehle |
| `TEMPLATES_MODULE.md` | Vorlagenmodul |
| `KNOWLEDGE_BASE.md` | Wissensbasis |
| `REPORTS_PDF_EXPORT.md` | PDF- und Reportlogik |

## Regel

Neue Dokumentation soll dauerhaft verwendbar sein. Kurzlebige Patchnotizen, historische Buildfix-Protokolle und temporäre Hotfix-Dokumente gehören nicht mehr in den aktiven Dokumentationsbestand, sondern nur noch zusammengefasst in `CHANGELOG.md`. Die Root-README und diese Übersicht bleiben die öffentlichen Einstiegspunkte; Detailthemen werden nur behalten, wenn sie für Betrieb, Datenschutz, Security, Migration, Entwicklung oder RC-Abnahme dauerhaft erforderlich sind.
