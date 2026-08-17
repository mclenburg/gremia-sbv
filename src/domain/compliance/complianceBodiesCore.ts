import { header } from './complianceDocumentSupport.js';
import { auditHashChainDecisionSection, informationAndAccessRightsSection, personDirectoryProcessingActivitySection, sqlCipherDecisionSection, stepELegalBasesSection } from './complianceStepEContent.js';
export function tomsBody(generatedAt: string): string {
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
export function vvtBody(generatedAt: string): string {
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
export function dsfaBody(generatedAt: string): string {
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
export function matrixBody(generatedAt: string): string {
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
| Art. 13/14 DSGVO | Anpassbare Datenschutzinformation ist als Compliance-Vorlage abrufbar; Ausgabe und Freigabe erfolgen organisatorisch durch Arbeitgeber/verantwortliche Stelle | vorbereitet | Datenschutzinformation abstimmen und ausgeben |
| Art. 15 DSGVO | strukturierte Auskunftsfähigkeit mit DSAR-Generator und Prüfschritten vorbereitet | vorbereitet | Schwärzungsprozess festlegen |
| Audit-Hash-Kette | Audit ohne Direktidentifikatoren; Hash-Kette bleibt bei Löschung/Anonymisierung stabil | umgesetzt / testpflichtig | Integritätsbericht prüfen |
| SQLCipher | Ruheverschlüsselung der strukturierten Personenstammdaten; keine zusätzliche Namens-Feldverschlüsselung in 0.9.1 | dokumentiert | Passphrase-/Backup-Regeln absichern |

## Bewertung

Gremia.SBV ist als lokales, verschlüsseltes SBV-Arbeitsmittel konzipiert. Die technische Grundlage ist datenschutzfreundlich. Die organisatorische Freigabe muss Zweck, Nutzerkreis, Speicherort, Backup, Exportregeln und Verantwortlichkeiten festlegen.
`;
}
