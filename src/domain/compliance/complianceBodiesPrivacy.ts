import { header } from './complianceDocumentSupport.js';
import { informationAndAccessRightsSection } from './complianceStepEContent.js';
export function retentionScheduleBody(generatedAt: string): string {
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
export function dataSubjectRightsBody(generatedAt: string): string {
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
- Art.-13/14-Datenschutzinformation als anpassbare Compliance-Vorlage.
- Fall- und Dokumentensuche.
- Lösch-/Anonymisierungslogik.
- Audit-Log zur Nachvollziehbarkeit.

## 6. Hinweis

Betroffenenrechte im SBV-Kontext können kollidierende Schutzinteressen berühren. Bei komplexen Fällen ist DSB- oder anwaltliche Prüfung erforderlich.
`;
}
export function dataProtectionNoticeBody(generatedAt: string): string {
  return `${header('Datenschutzinformation nach Art. 13/14 DSGVO – Vorlage für betroffene Beschäftigte', generatedAt)}## 1. Zweck dieser Vorlage

Diese Vorlage unterstützt die verantwortliche Stelle dabei, betroffene Beschäftigte transparent über die Verarbeitung personenbezogener Daten im Rahmen der SBV-Arbeit zu informieren. Sie ist ein anpassbarer Arbeitsentwurf und muss vor Verwendung organisatorisch, fachlich und datenschutzrechtlich geprüft und freigegeben werden.

Gremia.SBV versendet diese Information nicht automatisch. Die Erfüllung der Informationspflichten nach Art. 13 DSGVO und Art. 14 DSGVO bleibt Aufgabe der verantwortlichen Stelle.

## 2. Verantwortliche Stelle

| Feld | Eintrag |
|---|---|
| Verantwortlicher | [Arbeitgeber / Dienststelle eintragen] |
| Schwerbehindertenvertretung | [Vertrauensperson / Kontaktweg eintragen] |
| Datenschutzbeauftragte*r | [Kontakt eintragen] |
| IT-/Betriebskontakt | [optional eintragen] |

## 3. Zwecke der Verarbeitung

Die Verarbeitung erfolgt zur Wahrnehmung der gesetzlichen Aufgaben der Schwerbehindertenvertretung, insbesondere zur Beratung, Unterstützung, Interessenvertretung, Fristenkontrolle, Beteiligung und Dokumentation im Zusammenhang mit schwerbehinderten, gleichgestellten oder von Behinderung bedrohten Beschäftigten.

Typische Zwecke sind:

- Beratung und Unterstützung in SBV-Angelegenheiten.
- Begleitung von Präventionsverfahren, BEM, Gleichstellung/GdB-Beratung, Arbeitsplatzgestaltung und Kündigungsanhörungen.
- Dokumentation von Maßnahmen, Fristen, Gesprächsnotizen und erforderlichen Nachweisen.
- Wahrnehmung von Überwachungs-, Beteiligungs- und Unterstützungsrechten der SBV.
- Bearbeitung von Betroffenenrechten und Datenschutzprüfungen.

## 4. Kategorien personenbezogener Daten

Je nach Anlass können insbesondere verarbeitet werden:

- Stammdaten und dienstliche Kontaktdaten.
- Angaben zu Schutzstatus, Gleichstellung, laufendem Antrag oder Beratungsstatus.
- Fallakten-, Fristen-, Vorgangs- und Maßnahmendaten.
- Gesprächsnotizen, Dokumente, Nachweise und Korrespondenz, soweit für die SBV-Aufgabe erforderlich.
- besondere Kategorien personenbezogener Daten nach Art. 9 Abs. 1 DSGVO, insbesondere Gesundheitsdaten oder Angaben mit Bezug zu Behinderung.

Gremia.SBV ist datensparsam angelegt: Es gibt kein verpflichtendes Diagnosefeld und kein Standardfeld für den konkreten GdB-Grad. Medizinische Details sollen nur aufgenommen werden, soweit sie für den konkreten SBV-Zweck erforderlich sind.

## 5. Rechtsgrundlagen

Als Rechtsgrundlagen kommen regelmäßig in Betracht:

- Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit gesetzlichen Pflichten und Aufgaben im Beschäftigungskontext.
- Art. 9 Abs. 2 lit. b DSGVO für besondere Kategorien personenbezogener Daten im Arbeits- und Sozialschutzrecht.
- § 26 Abs. 3 BDSG für besondere Kategorien personenbezogener Daten im Beschäftigungskontext.
- § 178 Abs. 1 SGB IX und § 178 Abs. 2 Satz 1 SGB IX für Aufgaben, Überwachung, Unterstützung, Unterrichtung und Anhörung der Schwerbehindertenvertretung.
- Je nach Vorgang zusätzlich insbesondere § 164 Abs. 4 SGB IX, § 167 Abs. 1 SGB IX, § 167 Abs. 2 SGB IX und weitere einschlägige sozial- oder arbeitsrechtliche Vorschriften.

Die konkrete Rechtsgrundlage ist durch die verantwortliche Stelle anhand des jeweiligen Verarbeitungsvorgangs zu bestätigen.

## 6. Empfänger und Empfängerkategorien

Eine Weitergabe erfolgt nur, soweit sie für den konkreten Zweck erforderlich und rechtlich zulässig ist. Mögliche Empfänger oder Empfängerkategorien sind:

- die betroffene Person selbst,
- Schwerbehindertenvertretung und zulässig einbezogene Stellvertretungen,
- Betriebsrat oder Personalrat, soweit rechtlich erforderlich,
- Arbeitgeberstellen nur im erforderlichen Umfang,
- Inklusionsamt, Integrationsfachdienst, Rehabilitationsträger, Betriebsarzt oder weitere Stellen, soweit dies erforderlich und zulässig ist.

## 7. Speicherdauer und Löschung

Personenbezogene Daten werden nur solange gespeichert, wie sie für die konkrete SBV-Aufgabe, Nachweisführung, Fristenkontrolle oder Rechtsverteidigung erforderlich sind. Nach Zweckfortfall werden sie gelöscht, anonymisiert oder einer dokumentierten Fortspeicherungsprüfung zugeführt.

Fall-Dokumentdateien werden bei bestätigter Fall-Anonymisierung physisch entfernt. Eine bloße Trennung von Dokumentdatei und Datenbankmetadaten gilt nicht als ausreichende Anonymisierung.

Sicherheitseinträge im Audit-Log bleiben aus Integritätsgründen erhalten. Sie enthalten keine Direktidentifikatoren wie Name, E-Mail oder Personalnummer.

## 8. Betroffenenrechte

Betroffene Personen haben nach Maßgabe der DSGVO insbesondere Rechte auf:

- Auskunft nach Art. 15 DSGVO,
- Berichtigung nach Art. 16 DSGVO,
- Löschung nach Art. 17 DSGVO,
- Einschränkung der Verarbeitung nach Art. 18 DSGVO,
- Widerspruch nach Art. 21 DSGVO, soweit einschlägig,
- Beschwerde bei einer Datenschutzaufsichtsbehörde.

Bei Auskunfts- oder Herausgabeersuchen sind Rechte und Schutzinteressen Dritter sowie besondere Vertraulichkeitserfordernisse der SBV-Arbeit zu prüfen.

## 9. Pflicht zur Bereitstellung der Daten

Ob und welche Angaben erforderlich sind, hängt vom jeweiligen SBV-Vorgang ab. Beratungs- und Unterstützungsanliegen können häufig auch datensparsam oder zunächst pseudonym bearbeitet werden. Für bestimmte gesetzliche Beteiligungs-, Nachweis- oder Schutzrechte können einzelne Angaben jedoch erforderlich sein.

## 10. Automatisierte Entscheidungsfindung

Gremia.SBV trifft keine automatisierten Entscheidungen im Sinne von Art. 22 DSGVO. Die Software unterstützt Dokumentation, Prüfung, Fristenkontrolle und Arbeitsorganisation; die fachliche Bewertung bleibt bei der zuständigen SBV bzw. der verantwortlichen Stelle.

## 11. Anpassungsvermerk

Diese Vorlage muss vor Ausgabe ergänzt werden um:

- konkrete verantwortliche Stelle,
- konkrete Datenschutzkontakte,
- lokale Speicher-, Backup- und Zugriffsregelungen,
- betriebliche Lösch- und Aufbewahrungsfristen,
- ggf. organisationsspezifische Empfänger und Prozesse.
`;
}
export function exportPolicyBody(generatedAt: string): string {
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
