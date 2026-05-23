import type { GenerateReportInput } from '../src/app/core/models/report.model.js';
import type { ComplianceDocument, ComplianceDocumentDescriptor, ComplianceDocumentType, DataSubjectAccessRequestInput } from '../src/app/core/models/compliance.model.js';
import { auditHashChainDecisionSection, informationAndAccessRightsSection, personDirectoryProcessingActivitySection, sqlCipherDecisionSection, stepELegalBasesSection } from './complianceStepEContent.js';

export const COMPLIANCE_DOCUMENTS: ComplianceDocumentDescriptor[] = [
  {
    type: 'toms',
    title: 'TOMs – Technische und organisatorische Maßnahmen',
    description: 'Dokumentiert die technischen und organisatorischen Schutzmaßnahmen für lokale SBV-Fallarbeit.',
    buttonLabel: 'TOMs abrufen'
  },
  {
    type: 'vvt',
    title: 'VVT-Eintrag – SBV-Fallarbeit',
    description: 'Entwurf für das Verzeichnis von Verarbeitungstätigkeiten nach Art. 30 DSGVO.',
    buttonLabel: 'VVT abrufen'
  },
  {
    type: 'dsfa',
    title: 'DSFA-Entwurf',
    description: 'Vorbewertung zur Datenschutz-Folgenabschätzung nach Art. 35 DSGVO.',
    buttonLabel: 'DSFA abrufen'
  },
  {
    type: 'dsgvo_bdsg_matrix',
    title: 'DSGVO-/BDSG-Compliance-Auswertung',
    description: 'Matrix zu Anforderungen, Umsetzung, Bewertung und offenen Punkten.',
    buttonLabel: 'Compliance-Auswertung abrufen'
  },
  {
    type: 'retention_schedule',
    title: 'Lösch- und Aufbewahrungskonzept',
    description: 'Arbeitsentwurf für Aufbewahrung, Löschung, Anonymisierung und Review-Fristen.',
    buttonLabel: 'Löschkonzept abrufen'
  },
  {
    type: 'data_subject_rights',
    title: 'Prozess Betroffenenrechte',
    description: 'Prüf- und Ablaufhilfe für Auskunft, Berichtigung, Löschung und Einschränkung.',
    buttonLabel: 'Betroffenenrechte abrufen'
  },
  {
    type: 'export_policy',
    title: 'Export- und Weitergaberegeln',
    description: 'Interne Nutzungsregel für Klartextexporte, PDF-Abrufe und externe Weitergabe.',
    buttonLabel: 'Exportregeln abrufen'
  },
  {
    type: 'dsb_it_security_approval',
    title: 'Vorlage DSB / IT-Security',
    description: 'Formular zur Genehmigung der Softwarenutzung mit Sicherheitsmaßnahmen.',
    buttonLabel: 'Freigabeformular abrufen'
  },
  {
    type: 'data_protection_status',
    title: 'Technischer Datenschutzstatus vor Produktivnutzung',
    description: 'Prüfliste für Auto-Lock, Backup, Audit, temporäre Dateien, DSFA/TOM/VVT und organisatorische Freigaben.',
    buttonLabel: 'Technischen Status abrufen'
  },
  {
    type: 'release_readiness_checklist',
    title: '1.0-Release-Checkliste',
    description: 'Abnahmeliste für Build, Migration, Backup/Restore, Berichte, Overlay, Datenschutz und Known Issues.',
    buttonLabel: 'Release-Checkliste abrufen'
  },
  {
    type: 'dsar_response',
    title: 'Antwort auf DSGVO-Auskunftsersuchen',
    description: 'Strukturierte Antwort nach Art. 15 DSGVO mit Prüfliste, Datenkategorien und Rechtsbehelfsbelehrung.',
    buttonLabel: 'Auskunftsantwort abrufen'
  }
];

function nowIso(): string {
  return new Date().toISOString();
}

function displayDateTime(value: string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function plusDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function markdownFileName(type: ComplianceDocumentType, generatedAt: string): string {
  const stamp = generatedAt.replace(/[:.]/g, '-').slice(0, 19);
  return `gremia-sbv-${type}-${stamp}.md`;
}

function header(title: string, generatedAt: string): string {
  return `# ${title}

Erzeugt am: ${displayDateTime(generatedAt)}

Hinweis: Diese Unterlage dokumentiert die in Gremia.SBV vorgesehenen und umgesetzten Maßnahmen. Sie ersetzt keine abschließende Bewertung durch Datenschutzbeauftragte, IT-Security oder Rechtsberatung.

`;
}

function tomsBody(generatedAt: string): string {
  return `${header('TOMs – Technische und organisatorische Maßnahmen Gremia.SBV', generatedAt)}## 1. Vertraulichkeit

- Lokale Offline-first-Anwendung ohne Cloud-Synchronisierung.
- Verschlüsselter Tresor / verschlüsselte Datenbank.
- Zugriff nur nach erfolgreicher Entsperrung.
- Schlüsselmaterial in Buffer-Form wird beim Sperren best-effort überschrieben.
- Zugriffe, Suchen, Vorschauen, Exporte und Änderungen an personenbezogenen Daten werden lokal hashverkettet protokolliert.
- Keine Telemetrie und keine externen Analyse- oder Trackingdienste.
- Personenverzeichnis 0.9.1: Importkontrolle, Spaltenmapping, keine dauerhafte Speicherung der Arbeitgeber-Importdatei, kein GdB-Standardfeld, anonyme Anfrage nur als pseudonymer Personenstamm ohne Direktidentifikatoren.
- Statusabläufe werden im bestehenden Fristensystem als datenschutzfreundliche Wiedervorlagen geführt.
- Besonders sensible Fallnotizen werden als vertrauliche Fallnotizen geführt.
- ExportGuard warnt vor Exporten sensibler Inhalte.
- Während der entsperrten Nutzung liegen zur Anzeige/Bearbeitung erforderliche Daten im RAM vor. Vollständiger Schutz gegen Memory-Dumps eines entsperrten Systems kann nicht garantiert werden.

## 2. Integrität

- Strukturierte Fachmodule für Fallakte, Prävention, BEM, Gleichstellung/GdB und Kündigungsanhörung.
- Datenbankmigrationen versionieren Strukturänderungen.
- Backups werden verschlüsselt und prüfbar erzeugt.
- Berichtsexporte werden als verschlüsselte .gsbvpdf-Container abgelegt.
- Compliance-PDFs werden über denselben Report-Service erzeugt wie sonstige Berichte.
- Der System- und Integritätsbericht prüft die Audit-Hash-Chain auf Lücken, Hash-Brüche und rechnerische Manipulationen.
- Audit-Einträge enthalten ab 0.9.1 keine Direktidentifikatoren wie Namen, E-Mail-Adressen oder Personalnummern; gespeichert werden nur UUIDs, action, purpose, caseId, subjectId und timestamp. Die Hash-Kette bleibt nach Löschung oder Anonymisierung stabil.

## 3. Verfügbarkeit

- Portable lokale Nutzung.
- Backup-/Restore-Konzept.
- Keine Abhängigkeit von dauerhaft erreichbaren Serverdiensten für die tägliche Arbeit.

## 4. Belastbarkeit und Wiederherstellung

- Wiederherstellung über verschlüsselte Backups.
- Falsche Passphrase oder nicht passender Datenbestand sollen abgewiesen werden.
- Migrationen sind vor Release-Kandidaten mit Altständen zu testen.

## 5. Zugriffskontrolle

- Zugriff als SBV-Arbeitsmittel.
- Keine Arbeitgeberdatenbank und keine allgemeine HR-Datenbank.
- Zweckbindung auf SBV-Aufgaben.

## 6. Exportkontrolle

- iCal-Export ist nur ein manueller lokaler Export. Standardmäßig werden keine Namen, Diagnosen oder Fallinhalte in Kalendertermine geschrieben.
- ExportGuard vor sensiblen Dokumenten.
- Warnung bei Gesundheits-, Kündigungs-, BEM-, Gleichstellungs- und Fallnotizinhalten.
- PDF-Berichte und Compliance-Dokumente werden zunächst verschlüsselt gespeichert.
- Beim Abruf als PDF entsteht eine temporäre Klartextkopie für den externen Viewer.
- Exporte sind außerhalb des Tresors besonders schutzbedürftig.

## 7. Feldverschlüsselung und Suchbarkeit

- Strukturierte Personenstammdaten werden über SQLCipher im Ruhezustand geschützt.
- Eine zusätzliche Feldverschlüsselung von Vor- und Nachnamen wird in 0.9.1 bewusst nicht eingeführt; es gibt also keine zusätzliche Feldverschlüsselung für Namen, weil Suche, Sortierung und Importabgleich erforderlich sind und der Sicherheitsgewinn bei lokal verschlüsselter Einzelplatzdatenbank in keinem angemessenen Verhältnis zur Komplexität steht.
- Besonders sensible Freitexte mit Gesundheitsbezug bleiben von der bestehenden Gesundheitsdaten-/Fallnotizstrategie erfasst.

${auditHashChainDecisionSection()}
${sqlCipherDecisionSection()}
## 8. Offene Punkte vor 1.0

- Auto-Lock und Preview-Cleanup Ende-zu-Ende testen.
- Backup/Restore Ende-zu-Ende prüfen.
- Tätigkeitsbericht vollständig anonymisieren.
- Compliance-Unterlagen mit DSB und IT-Security fachlich gegenprüfen.
`;
}

function vvtBody(generatedAt: string): string {
  return `${header('VVT-Eintrag – Gremia.SBV / SBV-Fallarbeit', generatedAt)}## 1. Bezeichnung der Verarbeitungstätigkeit

Vertrauliche Fall-, Beratungs-, Beteiligungs- und Fristenarbeit der Schwerbehindertenvertretung mit Gremia.SBV.

${personDirectoryProcessingActivitySection()}
## 2. Verantwortlichkeit

| Feld | Eintrag |
|---|---|
| Verantwortlicher | Arbeitgeber / Dienststelle, organisatorisch zu bestätigen |
| Fachliche Stelle | Schwerbehindertenvertretung |
| Datenschutzkontakt | Datenschutzbeauftragte*r einzutragen |
| IT-Security-Kontakt | einzutragen |
| Software | Gremia.SBV, lokale Offline-first-Desktopanwendung |

## 3. Zwecke der Verarbeitung

- Wahrnehmung der gesetzlichen Aufgaben der SBV.
- Führung eines datensparsamen Personenverzeichnisses schwerbehinderter und gleichgestellter Beschäftigter einschließlich Schutzstatus, Statusgültigkeit, Beschäftigungsende und Fallaktenverknüpfung.
- Beratung und Unterstützung schwerbehinderter, gleichgestellter oder von Behinderung bedrohter Beschäftigter.
- Dokumentation von Beteiligungsvorgängen, Prävention, BEM, Gleichstellung/GdB, Arbeitsplatzanpassung und Kündigungsanhörung.
- Fristenkontrolle und Erstellung vertraulicher Arbeitsunterlagen.

## 4. Kategorien betroffener Personen

- schwerbehinderte Beschäftigte.
- gleichgestellte Beschäftigte.
- Beschäftigte mit laufendem Antrag oder Beratungsbedarf.
- Kontaktpersonen innerhalb und außerhalb des Unternehmens.

## 5. Kategorien personenbezogener Daten

- Personenverzeichnis: Vorname, Nachname, dienstliche E-Mail, Organisationseinheit, Standort, optional Personalnummer, Schutzstatus, Statusgültigkeit, Quelle, Beschäftigungsende und Lifecycle-Status. Kein GdB-Standardfeld. Keine Diagnosen.
- Stammdaten, Kontaktdaten und Aktenbezüge.
- Gesprächsnotizen, Vorgangsstatus und Fristen.
- Angaben zu Arbeitsplatz, Arbeitszeit, Belastungen, Hilfsmitteln und Maßnahmen.
- besondere Kategorien personenbezogener Daten, insbesondere Gesundheitsdaten nach Art. 9 DSGVO, soweit für die SBV-Aufgabe erforderlich.

## 6. Kategorien von Empfängern

- SBV-Vertrauensperson und im zulässigen Rahmen herangezogene Stellvertretungen.
- betroffene Person selbst.
- Betriebsrat, Arbeitgeber, Inklusionsamt, Integrationsfachdienst, Rehabilitationsträger oder weitere Stellen nur soweit erforderlich, rechtlich zulässig und zweckgebunden.

## 7. Übermittlungen in Drittländer

Keine geplante Übermittlung durch Gremia.SBV. Cloud-Synchronisierung ist nicht Bestandteil der lokalen Standardnutzung.

## 8. Lösch- und Aufbewahrungsfristen

Die konkrete Frist ist betrieblich festzulegen. Empfohlen ist eine regelmäßige Review-Logik mit Löschung oder Anonymisierung, sobald der Zweck entfällt und keine rechtlichen Aufbewahrungs- oder Nachweisinteressen entgegenstehen.

${stepELegalBasesSection()}
## 9. Rechtsgrundlagen

Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit Art. 9 Abs. 2 lit. b DSGVO, § 26 Abs. 3 BDSG sowie den Aufgaben und Beteiligungsrechten der Schwerbehindertenvertretung nach § 178 Abs. 1 SGB IX und § 178 Abs. 2 Satz 1 SGB IX. Für Arbeitgeberverzeichnis und Arbeitgeberliste ist zusätzlich § 163 SGB IX zu berücksichtigen; für behinderungsgerechte Beschäftigung, Arbeitsplatzgestaltung, Arbeitsorganisation, Hilfsmittel und Teilzeit ist § 164 Abs. 4 SGB IX ausdrücklich Rechts- und Zweckbezug.

Beschäftigte sind organisatorisch über die Verarbeitung zu informieren, insbesondere über die Datenschutzinformation des Arbeitgebers. Gremia.SBV versendet keine eigenständigen Art. 13/14-DSGVO-Benachrichtigungen.

${informationAndAccessRightsSection()}
${auditHashChainDecisionSection()}
${sqlCipherDecisionSection()}
## 10. Technische und organisatorische Maßnahmen

Siehe TOMs-Dokument. Besonders relevant sind Verschlüsselung, lokale Datenhaltung, Zugriffsschutz, Exportkontrolle, Backup-Konzept und Audit-Log.

## 11. Prüfvermerk

| Prüffrage | Status / Entscheidung |
|---|---|
| Rechtsgrundlage intern dokumentiert? |  |
| DSFA erforderlich / abgeschlossen? |  |
| Backup-Ort freigegeben? |  |
| Stellvertretungszugriffe geregelt? |  |
| Exportregeln bekanntgegeben? |  |
`;
}

function dsfaBody(generatedAt: string): string {
  return `${header('DSFA-Entwurf Gremia.SBV', generatedAt)}## 1. Verarbeitungsvorgang

Gremia.SBV unterstützt die vertrauliche Fallarbeit der Schwerbehindertenvertretung. Verarbeitet werden Fallakten, Kontakte, Fristen, Notizen, BEM-, Präventions-, Gleichstellungs-/GdB- und Kündigungsanhörungsinformationen.

## 2. Zweck

- Wahrnehmung der gesetzlichen Aufgaben der SBV.
- Führung eines datensparsamen Personenverzeichnisses schwerbehinderter und gleichgestellter Beschäftigter einschließlich Schutzstatus, Statusgültigkeit, Beschäftigungsende und Fallaktenverknüpfung.
- Dokumentation und Nachverfolgung von Beratungs- und Beteiligungsvorgängen.
- Fristenkontrolle.
- Erstellung von Schreiben, Berichten und internen Arbeitsunterlagen.

${personDirectoryProcessingActivitySection()}
${stepELegalBasesSection()}
## 3. Datenkategorien

- Stammdaten / Fallbezeichnungen.
- Kontaktdaten.
- Fristen und Vorgangsstatus.
- Gesundheitsbezogene Hinweise in Fallnotizen, BEM, Gleichstellung/GdB und Kündigungskontexten.
- Arbeitgebervortrag, SBV-Bewertungen und Stellungnahmen.

## 4. Betroffene Personen

- schwerbehinderte und gleichgestellte Beschäftigte.
- Beschäftigte mit laufendem Antrag oder Beratungsbedarf.
- interne und externe Ansprechpartner.

## 5. Risiken

| Risiko | Bewertung | Maßnahmen |
|---|---:|---|
| Verlust des Geräts oder Datenträgers | hoch | Verschlüsselter Tresor, starke Passphrase, Backup-Konzept |
| Unbeabsichtigter Export sensibler Daten | hoch | ExportGuard, Warnhinweise, Zweckbindung |
| Zugriff durch Unbefugte | hoch | Entsperrlogik, lokale Nutzung, kein Cloud-Zwang, Audit-Log |
| Re-Identifikation in Berichten | mittel bis hoch | anonymisierte Auswertung, keine sensiblen Freitexte |
| Fehlmigration alter Daten | mittel | Migrationstests, Restore-Test, klare Fehlermeldungen |

## 6. Schutzmaßnahmen

Siehe TOMs. Besonders relevant: Verschlüsselung, Offline-Betrieb, ExportGuard, Backup/Restore, Lösch-/Anonymisierungslogik, dokumentierte Zweckbindung, Personenverzeichnis, Importkontrolle, Statusablaufwarnung, iCal-Export und Art. 13/14-Organisationshinweis.

${informationAndAccessRightsSection()}
${auditHashChainDecisionSection()}
${sqlCipherDecisionSection()}
## 7. Restrisiko

Ein Restrisiko bleibt insbesondere bei manuellen Exporten, Zwischenablage, lokalen Dateikopien und unsachgemäßer Nutzung. Diese Risiken müssen organisatorisch adressiert werden.

## 8. Empfehlung

Freigabe nur mit dokumentierten Nutzungsregeln, starker Passphrase, geklärtem Backup-Ort, Exportregeln und regelmäßiger Überprüfung.
`;
}

function matrixBody(generatedAt: string): string {
  return `${header('DSGVO-/BDSG-Compliance-Auswertung Gremia.SBV', generatedAt)}| Anforderung | Umsetzung in Gremia.SBV | Bewertung | Offene Punkte |
|---|---|---|---|
| Art. 5 DSGVO – Grundsätze | Zweckbindung auf SBV-Arbeit, Datenminimierung durch strukturierte Module | teilweise umgesetzt | Nutzungsregeln dokumentieren |
| Art. 6 DSGVO – Rechtsgrundlage | Verarbeitung im Beschäftigungskontext zur gesetzlichen SBV-Aufgabe | organisatorisch zu bestätigen | Rechtsgrundlage intern dokumentieren |
| Art. 9 DSGVO – besondere Kategorien | Gesundheitsdaten und Schutzstatus können verarbeitet werden; Art. 9 Abs. 2 lit. b DSGVO / § 26 Abs. 3 BDSG dokumentieren | hohes Schutzniveau erforderlich | DSFA final bewerten |
| Art. 25 DSGVO – Privacy by Design | Offline-first, Verschlüsselung, Exportwarnungen, Anonymisierung | umgesetzt / auszubauen | Tätigkeitsbericht prüfen |
| Art. 30 DSGVO – Verzeichnis | VVT-Entwurf inklusive Personenverzeichnis im Compliance Center abrufbar | vorbereitet | VVT-Eintrag organisatorisch freigeben |
| Art. 32 DSGVO – Sicherheit | Verschlüsselung, Zugriffsschutz, Backup-Konzept, keine Telemetrie, hashverkettetes Audit-Log | umgesetzt / testpflichtig | Backup/Restore und Audit-Chain final testen |
| Art. 35 DSGVO – DSFA | DSFA-Entwurf abrufbar | vorbereitet | finale DSFA durch DSB/Verantwortliche |
| BDSG Beschäftigtendaten | Zweckbindung, Erforderlichkeit, Zugriffsbeschränkung | zu prüfen | Arbeitgeber-/DSB-Freigabeprozess |
| Betroffenenrechte | Prozessdokument und DSAR-Antwortgenerator vorhanden | teilweise | Freigabe- und Schwärzungsprozess ergänzen |

| Personenverzeichnis | Verarbeitungstätigkeit schwerbehinderter und gleichgestellter Beschäftigter ist in DSFA/TOM/VVT dokumentiert | vorbereitet | organisatorisch freigeben |
| § 164 Abs. 4 SGB IX | Arbeitsplatzgestaltung, Arbeitsorganisation, Hilfsmittel und Teilzeit sind als Zweckbezug dokumentiert | umgesetzt | Praxisprozess prüfen |
| Art. 13/14 DSGVO | Information erfolgt organisatorisch über Arbeitgeber/verantwortliche Stelle, nicht automatisch durch die App | vorbereitet | Datenschutzinformation abstimmen |
| Art. 15 DSGVO | strukturierte Auskunftsfähigkeit mit DSAR-Generator und Prüfschritten vorbereitet | vorbereitet | Schwärzungsprozess festlegen |
| Audit-Hash-Kette | Audit ohne Direktidentifikatoren; Hash-Kette bleibt bei Löschung/Anonymisierung stabil | umgesetzt / testpflichtig | Integritätsbericht prüfen |
| SQLCipher | Ruheverschlüsselung der strukturierten Personenstammdaten; keine zusätzliche Namens-Feldverschlüsselung in 0.9.1 | dokumentiert | Passphrase-/Backup-Regeln absichern |

## Bewertung

Gremia.SBV ist als lokales, verschlüsseltes SBV-Arbeitsmittel konzipiert. Die technische Grundlage ist datenschutzfreundlich. Die organisatorische Freigabe muss Zweck, Nutzerkreis, Speicherort, Backup, Exportregeln und Verantwortlichkeiten festlegen.
`;
}

function retentionScheduleBody(generatedAt: string): string {
  return `${header('Lösch- und Aufbewahrungskonzept Gremia.SBV', generatedAt)}## 1. Grundsatz

Personenbezogene Daten werden nur solange gespeichert, wie sie für die konkrete SBV-Aufgabe, Nachweisführung oder Rechtsverteidigung erforderlich sind. Danach sind sie zu löschen oder zu anonymisieren.

## 2. Regelmäßige Prüfung

- Fallakten: Review spätestens nach Abschluss und anschließend turnusmäßig.
- Fristen und Wiedervorlagen: Löschung oder Archivierung nach Zweckerfüllung.
- Berichte: anonymisierte Berichte bevorzugen; interne Prüfberichte vertraulich behandeln.
- Exporte: außerhalb des Tresors besonders kurz halten und gesondert schützen.

## 3. Arbeitsvorschlag für Fristen

| Datenbereich | Review-Auslöser | Maßnahme |
|---|---|---|
| offene Fallakte | laufender Vorgang | weiterführen, Datenminimierung prüfen |
| abgeschlossene Fallakte | Abschluss + Review | löschen, anonymisieren oder begründet aufbewahren |
| BEM/Prävention | Abschluss / Maßnahmenevaluation | Zweckfortfall prüfen |
| Kündigungsanhörung | Abschluss des Verfahrens | Nachweisinteresse prüfen |
| Gleichstellung/GdB | Abschluss Beratung / Antrag | Zweckbindung prüfen |
| Exporte | unmittelbare Zweckverwendung beendet | löschen oder gesichert ablegen |

## 4. Verantwortlichkeit

Die fachliche Entscheidung trifft die SBV im Rahmen ihrer Aufgaben. Organisatorische Vorgaben zu Datenschutz, Archivierung und Rechtsverteidigung sind mit DSB und ggf. Rechtsberatung abzustimmen.

## 5. Dokumentation

Lösch- und Anonymisierungsvorgänge sollen nachvollziehbar dokumentiert werden, ohne unnötige sensible Inhalte erneut festzuhalten.
`;
}

function dataSubjectRightsBody(generatedAt: string): string {
  return `${header('Prozess Betroffenenrechte Gremia.SBV', generatedAt)}## 1. Ziel

Dieses Dokument beschreibt einen Arbeitsprozess für Anfragen nach Auskunft, Berichtigung, Löschung, Einschränkung oder Kopie personenbezogener Daten im Zusammenhang mit Gremia.SBV.

## 2. Eingang und Identitätsprüfung

- Eingang der Anfrage dokumentieren.
- Identität prüfen, bevor personenbezogene Inhalte herausgegeben werden.
- Umfang des Ersuchens klären.
- Monatsfrist überwachen und ggf. Verlängerung begründen.

## 3. Fachliche Prüfung

- Welche Daten betreffen die anfragende Person?
- Enthalten Unterlagen Daten Dritter?
- Bestehen Vertraulichkeits-, Schutz- oder Rechtsverteidigungsinteressen?
- Sind Schwärzungen erforderlich?
- Muss der Datenschutzbeauftragte eingebunden werden?

## 4. Antwort

- Antwort strukturiert und verständlich formulieren.
- Datenkategorien, Zwecke, Empfänger und Speicherdauer benennen, soweit einschlägig.
- Keine unnötigen Gesundheitsdetails oder Drittdaten offenlegen.
- Entscheidung über Löschung/Berichtigung dokumentieren.

${informationAndAccessRightsSection()}
## 5. Werkzeuge in Gremia.SBV

- DSAR-Antwortgenerator im Compliance Center.
- Fall- und Dokumentensuche.
- Lösch-/Anonymisierungslogik.
- Audit-Log zur Nachvollziehbarkeit.

## 6. Hinweis

Betroffenenrechte im SBV-Kontext können kollidierende Schutzinteressen berühren. Bei komplexen Fällen ist DSB- oder anwaltliche Prüfung erforderlich.
`;
}

function exportPolicyBody(generatedAt: string): string {
  return `${header('Export- und Weitergaberegeln Gremia.SBV', generatedAt)}## 1. Grundsatz

Daten bleiben grundsätzlich im verschlüsselten Gremia.SBV-Tresor. Exporte sind Ausnahmen und müssen erforderlich, zweckgebunden und auf das notwendige Minimum beschränkt sein.

## 2. PDF-Berichte und Compliance-Dokumente

- Berichte werden über den zentralen Report-Service erzeugt.
- Der gespeicherte Export ist ein verschlüsselter .gsbvpdf-Container.
- Beim Abruf als PDF wird eine temporäre Klartextkopie für den externen PDF-Viewer erzeugt.
- Temporäre Klartextkopien sind nach Nutzung zu löschen; externe Viewer können eigene Caches erzeugen.

## 3. Markdown-Exporte

Markdown-Exporte aus dem Compliance Center sind Klartextexporte. Sie dürfen nur genutzt werden, wenn dies fachlich erforderlich ist und der Ablageort geschützt ist.

## 4. Weitergabe an Dritte

Vor jeder Weitergabe ist zu prüfen:

- Wer ist Empfänger?
- Welche Rechtsgrundlage oder Aufgabe rechtfertigt die Weitergabe?
- Welche Inhalte sind wirklich erforderlich?
- Müssen Namen, Aktenzeichen oder Gesundheitsdetails geschwärzt werden?
- Ist eine verschlüsselte Übermittlung erforderlich?

## 5. Dokumentation

Exporte und Weitergaben sollen nachvollziehbar dokumentiert werden, insbesondere bei Gesundheitsdaten, BEM, Prävention, Gleichstellung/GdB und Kündigungsvorgängen.
`;
}

function approvalBody(generatedAt: string): string {
  return `${header('Freigabeformular Gremia.SBV für Datenschutzbeauftragte und IT-Security', generatedAt)}## 1. Zweck der Software

Gremia.SBV dient der vertraulichen Arbeitsorganisation der Schwerbehindertenvertretung.

## 2. Nutzerkreis

- Vertrauensperson der schwerbehinderten Menschen.
- ggf. herangezogene Stellvertretungen nach interner Festlegung.
- keine allgemeine Nutzung durch Arbeitgeber, HR oder Betriebsrat.

## 3. Betriebsform

- Lokale Desktop-Anwendung.
- Offline-first.
- Keine Cloud-Synchronisation.
- Keine Telemetrie.

## 4. Datenarten

- Fallakten und Gesprächsnotizen.
- Fristen.
- Kontakte.
- Präventions-, BEM-, Gleichstellungs-/GdB- und Kündigungsanhörungsdaten.
- mögliche besondere Kategorien personenbezogener Daten nach Art. 9 DSGVO.

## 5. Sicherheitsmaßnahmen

- verschlüsselter Tresor / verschlüsselte Datenbank.
- lokales hashverkettetes Audit-Log für Zugriff/Änderung personenbezogener Daten.
- starke Passphrase.
- verschlüsselte Backups.
- verschlüsselte PDF-Reportcontainer.
- ExportGuard.
- Lösch-/Anonymisierungsfunktionen.
- lokale Datenhaltung.

## 6. Export und Weitergabe

Exporte dürfen nur zweckgebunden, erforderlich und mit minimal notwendigem Inhalt erfolgen. Exporte liegen außerhalb des Tresors und sind besonders zu schützen.

## 7. Offene Prüfentscheidung

| Prüffrage | Bewertung / Auflage |
|---|---|
| Speicherort genehmigt? |  |
| Backup-Ort genehmigt? |  |
| Passphrase-Regeln genehmigt? |  |
| Exportregeln genehmigt? |  |
| DSFA erforderlich / abgeschlossen? |  |
| VVT-Eintrag erforderlich / abgeschlossen? |  |
| Nutzung durch Stellvertretungen geregelt? |  |

## 8. Freigabe

Datenschutzbeauftragte*r:

Name: ___________________________

Entscheidung: ☐ freigegeben ☐ freigegeben mit Auflagen ☐ nicht freigegeben

Auflagen:

______________________________________________________________________

IT-Security:

Name: ___________________________

Entscheidung: ☐ freigegeben ☐ freigegeben mit Auflagen ☐ nicht freigegeben

Auflagen:

______________________________________________________________________

Review-Termin: __________________
`;
}

function dataProtectionStatusBody(generatedAt: string): string {
  return `${header('Datenschutzstatus Gremia.SBV vor Produktivnutzung', generatedAt)}## 1. Zweck

Diese Prüfliste unterstützt die SBV dabei, den lokalen Gremia.SBV-Tresor vor produktiver Nutzung fachlich, technisch und organisatorisch zu bewerten. Sie ersetzt keine Freigabe durch Datenschutzbeauftragte, IT-Security oder Rechtsberatung.

## 2. Statusampel

| Bereich | Sollzustand | Status / Nachweis |
|---|---|---|
| Verschlüsselter Tresor | Datenbank und Dokumente lokal verschlüsselt |  |
| Auto-Lock | automatische Sperre aktiv und getestet |  |
| Temporäre Arbeitskopien | tmp-Bereich nach PDF-/Dokumentabruf bereinigt |  |
| Audit-Hash-Chain | System- und Integritätsbericht ohne Hash-Fehler |  |
| Backup | verschlüsseltes Backup erzeugt und Restore getestet |  |
| TOMs | erzeugt und fachlich geprüft |  |
| VVT | Entwurf erzeugt und Verantwortlichkeit geklärt |  |
| DSFA | Erforderlichkeit geprüft / Entwurf bewertet |  |
| Löschkonzept | Review- und Löschlogik organisatorisch entschieden |  |
| Stellvertretung | Zugriff und Heranziehung organisatorisch geregelt |  |
| Externe Viewer | Risiken temporärer PDF-Kopien dokumentiert |  |

## 3. Bewertung

- Grün: Technische Grundlage vorhanden und organisatorisch entschieden.
- Rot: Kritische Schutzlücke oder fehlender Nachweis.

## 4. Mindestempfehlung vor produktiver Nutzung

- Auto-Lock testen.
- System- und Integritätsbericht erzeugen.
- Temporäre Arbeitskopien bereinigen.
- Erstes verschlüsseltes Backup erzeugen und testweise prüfen.
- TOMs, VVT und DSFA-Entwurf mit Datenschutzbeauftragten / IT-Security abstimmen. Diese Prüfung wird durch die Software nur erinnert, nicht bewertet.
- Regeln für Stellvertretung und Exporte schriftlich festhalten.
`;
}

function releaseReadinessChecklistBody(generatedAt: string): string {
  return `${header('1.0-Release-Checkliste Gremia.SBV', generatedAt)}## 1. Technische Abnahme

| Prüfung | Erwartung | Ergebnis |
|---|---|---|
| npm run build | fehlerfrei |  |
| npm run build:linux | AppImage wird erzeugt |  |
| frische Datenbank | Start und Einrichtung erfolgreich |  |
| Migration Altstand | Schema wird konsistent auf aktuellen Stand gebracht |  |
| Backup erzeugen | verschlüsselte .gsbvbackup-Datei |  |
| Backup prüfen / Restore | Integrität und Schema-Version plausibel |  |
| Berichte erzeugen | alle Reporttypen erzeugbar |  |
| PDF abrufen | temporäre Dateien werden kontrolliert |  |
| Audit-Manipulationstest | Hash-Chain erkennt Änderung |  |

## 2. Fachliche Abnahme

| Bereich | Erwartung | Ergebnis |
|---|---|---|
| Fallakte | Maßnahmen werden dort angelegt und fortgeschrieben |  |
| Inlinebefehle | /fr, /wv, /bet, /anp, /bem, /praev, /kuend, /gleich funktionieren |  |
| Vorbelegung | Felder sind sinnvoll vorbelegt und ohne Zusatzklick speicherbar |  |
| Beteiligung | Cockpit ist Übersicht, Bearbeitung in Fallakte |  |
| Arbeitsplatzgestaltung | Maßnahme nach § 164 Abs. 4 SGB IX in Fallakte |  |
| Fristen | fall- und maßnahmenbezogen sichtbar |  |
| Dokumente | fall- und maßnahmenbezogen zuordenbar |  |
| Tätigkeitsbericht | anonymisiert und ohne sensible Freitexte |  |

## 3. Datenschutzabnahme

| Prüfung | Erwartung | Ergebnis |
|---|---|---|
| TOMs | erzeugt und geprüft |  |
| VVT | Verantwortlichkeit dokumentiert |  |
| DSFA | Prüfung dokumentiert |  |
| Löschkonzept | Review-Logik entschieden |  |
| Exportregeln | schriftlich festgelegt |  |
| DSB-/IT-Freigabe | Entscheidung / Auflagen dokumentiert |  |
| Known Issues | offen dokumentiert |  |

## 4. Releaseentscheidung

- ☐ Release Candidate freigeben
- ☐ nur mit Auflagen freigeben
- ☐ nicht freigeben

Auflagen / offene Punkte:

______________________________________________________________________
`;
}


function dsarCell(value: unknown): string {
  const text = String(value ?? '—').trim() || '—';
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function dsarTable<T>(headers: string[], rows: T[], map: (row: T) => unknown[]): string {
  if (!rows.length) return 'Keine automatisch zugeordneten Datensätze gefunden.';
  return `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map((row) => `| ${map(row).map(dsarCell).join(' | ')} |`).join('\n')}`;
}

function dsarPrefillBody(input: DataSubjectAccessRequestInput): string {
  const prefill = input.prefill;
  if (!prefill) {
    return `## 5. Automatisch vorbefüllte Daten aus Gremia.SBV

Keine automatische Vorbefüllung ausgeführt. Bitte über die Funktion „Daten aus Gremia.SBV vorbefüllen“ Personen-, Fallakten-, Fristen-, Maßnahmen-, Import- und Lifecycle-Daten ermitteln oder den Vorgang manuell dokumentieren.
`;
  }

  return `## 5. Automatisch vorbefüllte Daten aus Gremia.SBV

Ermittelt am: ${displayDateTime(prefill.generatedAt)}

${prefill.matchReason}

**Wichtiger Freigabehinweis:** Diese Vorbefüllung ist ein Arbeitsbestand. Vor Herausgabe sind Drittdaten, vertrauliche Angaben aus der SBV-Arbeit, Gesundheitsdaten, freie Notiztexte und gesetzliche Zurückbehaltungsgründe gesondert zu prüfen und erforderlichenfalls zu schwärzen.

### 5.1 Personenstamm / Schutzstatus

${dsarTable(['Name / Kennung', 'Personalnummer', 'E-Mail', 'Schutzstatus', 'Organisation', 'Standort', 'Status gültig bis', 'Lifecycle'], prefill.persons, (person) => [person.displayName, person.personnelNumber, person.workEmail, person.protectionStatus, person.organizationalUnit, person.location, person.statusValidUntil, person.lifecycleState])}

### 5.2 Fallakten

${dsarTable(['Aktenzeichen', 'Bezeichnung', 'Kategorie', 'Status', 'Priorität', 'Eröffnet', 'Geschlossen'], prefill.cases, (record) => [record.caseNumber, record.displayName, record.category, record.status, record.priority, record.openedAt, record.closedAt])}

### 5.3 Fristen und Wiedervorlagen

${dsarTable(['Titel', 'Prozess', 'Art', 'Status', 'Fälligkeit', 'Rechtsgrundlage'], prefill.deadlines, (deadline) => [deadline.title, deadline.processType, deadline.deadlineType, deadline.status, deadline.dueAt, deadline.legalBasis])}

### 5.4 Maßnahmen und Prozessmodule

${dsarTable(['Titel', 'Typ', 'Status', 'Risiko', 'Eröffnet', 'Fällig', 'Nachverfolgung'], prefill.measures, (measure) => [measure.title, measure.type, measure.status, measure.riskLevel, measure.openedAt, measure.dueAt, measure.requiresFollowUp ? 'Ja' : 'Nein'])}

### 5.5 Arbeitgeberlisten-Importe

${dsarTable(['Quelle', 'Importiert am', 'Importaktion', 'Geänderte Felder'], prefill.importRuns, (run) => [run.sourceFileName, run.importedAt, run.action, run.changedFields.join(', ') || '—'])}

### 5.6 Lifecycle- und Audit-Ereignisse

${dsarTable(['Zeitpunkt', 'Aktion', 'Betreff', 'Zweck'], prefill.lifecycleEvents, (event) => [event.occurredAt, event.action, event.subjectType, event.purpose])}

### 5.7 Freitext-Fundstellen und verknüpfte Fallakteninhalte

Diese Liste ist bewusst als Prüfliste aufgebaut: Sie enthält direkte Namens-/Aktenzeichen-Treffer sowie Freitexte aus eindeutig verknüpften Fallakten, auch wenn dort nur Vorname, nur Nachname oder gar keine Namensnennung im Ausschnitt steht. Jede Fundstelle ist vor Herausgabe auf Drittdaten, Gesundheitsdaten und Schwärzungsbedarf zu prüfen.

${dsarTable(['Quelle', 'Titel', 'Fall', 'Trefferart', 'Suchtreffer', 'Auszug', 'Manuelle Prüfung'], prefill.freeTextMatches ?? [], (match) => [match.sourceLabel, match.title, match.caseNumber || match.caseId, match.matchKind === 'linked_case' ? 'verknüpfte Fallakte' : 'Name/Aktenbezug', match.matchedTerms.join(', ') || 'fallaktenverknüpft', match.excerpt, match.requiresManualReview ? 'erforderlich' : '—'])}
`;
}

function dsarBody(input: DataSubjectAccessRequestInput, generatedAt: string): string {
  return `${header('Antwort auf DSGVO-Auskunftsersuchen – Arbeitsentwurf', generatedAt)}## 1. Vorgang

| Feld | Inhalt |
|---|---|
| Anfragende Person | ${input.requesterName || '—'} |
| Eingang des Ersuchens | ${input.requestReceivedAt || '—'} |
| Antwortfrist | ${input.responseDueAt || '—'} |
| Fall-/Aktenbezug | ${input.caseReference || '—'} |
| Identität geprüft | ${input.identityVerified ? 'Ja' : 'Nein / noch offen'} |
| Bearbeitet durch | ${input.preparedBy || '—'} |

## 2. Umfang des Ersuchens

${input.requestScope || 'Der Umfang des Ersuchens ist noch zu konkretisieren.'}

## 3. Prüfschritte vor Antwort

- Identität der anfragenden Person prüfen.
- Betroffene Datenbestände in Gremia.SBV ermitteln.
- Drittdaten und vertrauliche Angaben anderer Personen identifizieren.
- Gesundheitsdaten und besondere Kategorien gesondert prüfen.
- Lösch- und Aufbewahrungsinteressen abwägen.
- Datenschutzbeauftragte*n bei Unsicherheit einbinden.

## 4. Antwortbaustein

Sehr geehrte*r ${input.requesterName || '[Name]'},

wir bestätigen den Eingang Ihres Auskunftsersuchens. Nach Prüfung der in Gremia.SBV geführten Daten erhalten Sie eine strukturierte Auskunft über die zu Ihrer Person gespeicherten Datenkategorien, Zwecke, Empfänger bzw. Empfängerkategorien und die vorgesehene Speicherdauer, soweit diese Angaben einschlägig und rechtlich herausgabefähig sind.

Soweit Unterlagen personenbezogene Daten Dritter oder besonders schutzwürdige vertrauliche Angaben enthalten, wird vor Herausgabe eine Schwärzung bzw. gesonderte rechtliche Prüfung vorgenommen.

${dsarPrefillBody(input)}
## 6. Rechtsbehelfs- und Kontakt-Hinweis

Bei datenschutzrechtlichen Fragen können Sie sich an die zuständige Datenschutzstelle wenden. Unabhängig davon besteht das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren.

## 7. Interner Vermerk

Dieses Dokument ist ein Arbeitsentwurf. Vor Versand ist eine fachliche Prüfung erforderlich.
`;
}

function bodyFor(type: ComplianceDocumentType, generatedAt: string, dsarInput?: DataSubjectAccessRequestInput): string {
  switch (type) {
    case 'toms': return tomsBody(generatedAt);
    case 'vvt': return vvtBody(generatedAt);
    case 'dsfa': return dsfaBody(generatedAt);
    case 'dsgvo_bdsg_matrix': return matrixBody(generatedAt);
    case 'retention_schedule': return retentionScheduleBody(generatedAt);
    case 'data_subject_rights': return dataSubjectRightsBody(generatedAt);
    case 'export_policy': return exportPolicyBody(generatedAt);
    case 'dsb_it_security_approval': return approvalBody(generatedAt);
    case 'data_protection_status': return dataProtectionStatusBody(generatedAt);
    case 'release_readiness_checklist': return releaseReadinessChecklistBody(generatedAt);
    case 'dsar_response': return dsarBody(dsarInput ?? defaultDsarInput(), generatedAt);
    default: {
      const exhaustive: never = type;
      return String(exhaustive);
    }
  }
}

export function listComplianceDocuments(): ComplianceDocumentDescriptor[] {
  return COMPLIANCE_DOCUMENTS;
}

export function renderComplianceDocument(type: ComplianceDocumentType): ComplianceDocument {
  const generatedAt = nowIso();
  const descriptor = COMPLIANCE_DOCUMENTS.find((item) => item.type === type) ?? COMPLIANCE_DOCUMENTS[0];
  return {
    type: descriptor.type,
    title: descriptor.title,
    description: descriptor.description,
    filename: markdownFileName(descriptor.type, generatedAt),
    body: bodyFor(descriptor.type, generatedAt),
    generatedAt
  };
}

export function defaultDsarInput(): DataSubjectAccessRequestInput {
  const received = new Date();
  return {
    requesterName: '',
    requestReceivedAt: toDateInputValue(received),
    responseDueAt: toDateInputValue(plusDays(received, 30)),
    caseReference: '',
    identityVerified: false,
    requestScope: 'Auskunft über die in Gremia.SBV verarbeiteten personenbezogenen Daten.',
    preparedBy: 'Schwerbehindertenvertretung'
  };
}

export function renderDsarResponseDocument(input: DataSubjectAccessRequestInput): ComplianceDocument {
  const generatedAt = nowIso();
  const descriptor = COMPLIANCE_DOCUMENTS.find((item) => item.type === 'dsar_response')!;
  return {
    type: 'dsar_response',
    title: descriptor.title,
    description: descriptor.description,
    filename: markdownFileName('dsar_response', generatedAt),
    body: bodyFor('dsar_response', generatedAt, input),
    generatedAt
  };
}

export function complianceClassificationFor(type: ComplianceDocumentType): string {
  switch (type) {
    case 'toms':
    case 'vvt':
    case 'dsgvo_bdsg_matrix':
    case 'retention_schedule':
    case 'data_subject_rights':
    case 'export_policy':
    case 'data_protection_status':
    case 'release_readiness_checklist':
      return 'Intern / Compliance';
    case 'dsfa':
    case 'dsb_it_security_approval':
    case 'dsar_response':
      return 'Intern vertraulich';
    default: {
      const exhaustive: never = type;
      return String(exhaustive);
    }
  }
}

export function buildComplianceReportInput(document: ComplianceDocument): GenerateReportInput {
  return {
    type: 'compliance_document',
    complianceDocumentType: document.type,
    complianceTitle: document.title,
    complianceSubtitle: document.description,
    complianceClassification: complianceClassificationFor(document.type),
    complianceBody: document.body
  };
}
