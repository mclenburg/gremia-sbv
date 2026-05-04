import type { ComplianceDocument, ComplianceDocumentDescriptor, ComplianceDocumentType, DataSubjectAccessRequestInput } from '../src/app/core/models/compliance.model.js';

export const COMPLIANCE_DOCUMENTS: ComplianceDocumentDescriptor[] = [
  {
    type: 'toms',
    title: 'TOMs – Technische und organisatorische Maßnahmen',
    description: 'Dokumentiert die Sicherheitsmaßnahmen von Gremia.SBV für lokale SBV-Fallarbeit.',
    buttonLabel: 'TOMs abrufen'
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
    type: 'dsb_it_security_approval',
    title: 'Vorlage DSB / IT-Security',
    description: 'Formular zur Genehmigung der Softwarenutzung mit Sicherheitsmaßnahmen.',
    buttonLabel: 'Freigabeformular abrufen'
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

function header(title: string, generatedAt: string): string {
  return `# ${title}

Erzeugt am: ${new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(generatedAt))}

Hinweis: Diese Unterlage dokumentiert die in Gremia.SBV vorgesehenen und umgesetzten Maßnahmen. Sie ersetzt keine abschließende Bewertung durch Datenschutzbeauftragte, IT-Security oder Rechtsberatung.

`;
}

function tomsBody(generatedAt: string): string {
  return `${header('TOMs – Technische und organisatorische Maßnahmen Gremia.SBV', generatedAt)}
## 1. Vertraulichkeit

- Lokale Offline-first-Anwendung ohne Cloud-Synchronisierung.
- Verschlüsselter Tresor / verschlüsselte Datenbank.
- Zugriff nur nach erfolgreicher Entsperrung.
- Keine Telemetrie und keine externen Analyse- oder Trackingdienste.
- Besonders sensible Fallnotizen werden als vertrauliche Fallnotizen geführt.
- ExportGuard warnt vor Exporten sensibler Inhalte.

## 2. Integrität

- Strukturierte Fachmodule für Fallakte, Prävention, BEM, Gleichstellung/GdB und Kündigungsanhörung.
- Datenbankmigrationen versionieren Strukturänderungen.
- Backups werden verschlüsselt und prüfbar erzeugt.
- Vorlagenexporte werden vor Herausgabe geprüft.

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

- ExportGuard vor sensiblen Dokumenten.
- Warnung bei Gesundheits-, Kündigungs-, BEM-, Gleichstellungs- und Fallnotizinhalten.
- Exporte sind außerhalb des Tresors besonders schutzbedürftig.

## 7. Offene Punkte vor 1.0

- Migrationen mit realistischen Altständen testen.
- Backup/Restore Ende-zu-Ende prüfen.
- Tätigkeitsbericht vollständig anonymisieren.
- Compliance-Unterlagen mit DSB und IT-Security fachlich gegenprüfen.
`;
}

function dsfaBody(generatedAt: string): string {
  return `${header('DSFA-Entwurf Gremia.SBV', generatedAt)}
## 1. Verarbeitungsvorgang

Gremia.SBV unterstützt die vertrauliche Fallarbeit der Schwerbehindertenvertretung. Verarbeitet werden Fallakten, Kontakte, Fristen, Notizen, BEM-, Präventions-, Gleichstellungs-/GdB- und Kündigungsanhörungsinformationen.

## 2. Zweck

- Wahrnehmung der gesetzlichen Aufgaben der SBV.
- Dokumentation und Nachverfolgung von Beratungs- und Beteiligungsvorgängen.
- Fristenkontrolle.
- Erstellung von Schreiben, Berichten und internen Arbeitsunterlagen.

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
| Zugriff durch Unbefugte | hoch | Entsperrlogik, lokale Nutzung, kein Cloud-Zwang |
| Re-Identifikation in Berichten | mittel bis hoch | anonymisierte Auswertung, keine sensiblen Freitexte |
| Fehlmigration alter Daten | mittel | Migrationstests, Restore-Test, klare Fehlermeldungen |

## 6. Schutzmaßnahmen

Siehe TOMs. Besonders relevant: Verschlüsselung, Offline-Betrieb, ExportGuard, Backup/Restore, Lösch-/Anonymisierungslogik, dokumentierte Zweckbindung.

## 7. Restrisiko

Ein Restrisiko bleibt insbesondere bei manuellen Exporten, Zwischenablage, lokalen Dateikopien und unsachgemäßer Nutzung. Diese Risiken müssen organisatorisch adressiert werden.

## 8. Empfehlung

Freigabe nur mit dokumentierten Nutzungsregeln, starker Passphrase, geklärtem Backup-Ort, Exportregeln und regelmäßiger Überprüfung.
`;
}

function matrixBody(generatedAt: string): string {
  return `${header('DSGVO-/BDSG-Compliance-Auswertung Gremia.SBV', generatedAt)}
| Anforderung | Umsetzung in Gremia.SBV | Bewertung | Offene Punkte |
|---|---|---|---|
| Art. 5 DSGVO – Grundsätze | Zweckbindung auf SBV-Arbeit, Datenminimierung durch strukturierte Module | teilweise umgesetzt | Nutzungsregeln dokumentieren |
| Art. 6 DSGVO – Rechtsgrundlage | Verarbeitung im Beschäftigungskontext zur gesetzlichen SBV-Aufgabe | organisatorisch zu bestätigen | Rechtsgrundlage intern dokumentieren |
| Art. 9 DSGVO – besondere Kategorien | Gesundheitsdaten können verarbeitet werden; Schutz durch Verschlüsselung und ExportGuard | hohes Schutzniveau erforderlich | DSFA final bewerten |
| Art. 25 DSGVO – Privacy by Design | Offline-first, Verschlüsselung, Exportwarnungen, Anonymisierung | umgesetzt / auszubauen | Tätigkeitsbericht prüfen |
| Art. 30 DSGVO – Verzeichnis | Angaben können in Freigabeformular übernommen werden | vorbereitet | VVT-Eintrag organisatorisch erstellen |
| Art. 32 DSGVO – Sicherheit | Verschlüsselung, Zugriffsschutz, Backup-Konzept, keine Telemetrie | umgesetzt / testpflichtig | Backup/Restore final testen |
| Art. 35 DSGVO – DSFA | DSFA-Entwurf abrufbar | vorbereitet | finale DSFA durch DSB/Verantwortliche |
| BDSG Beschäftigtendaten | Zweckbindung, Erforderlichkeit, Zugriffsbeschränkung | zu prüfen | Arbeitgeber-/DSB-Freigabeprozess |
| Betroffenenrechte | Auskunft/Löschung organisatorisch zu regeln; Lösch-/Anonymisierungslogik vorhanden | teilweise | Prozessbeschreibung ergänzen |

## Bewertung

Gremia.SBV ist als lokales, verschlüsseltes SBV-Arbeitsmittel konzipiert. Die technische Grundlage ist datenschutzfreundlich. Die organisatorische Freigabe muss Zweck, Nutzerkreis, Speicherort, Backup, Exportregeln und Verantwortlichkeiten festlegen.
`;
}

function approvalBody(generatedAt: string): string {
  return `${header('Freigabeformular Gremia.SBV für Datenschutzbeauftragte und IT-Security', generatedAt)}
## 1. Zweck der Software

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
- starke Passphrase.
- verschlüsselte Backups.
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


export function defaultDsarInput(): DataSubjectAccessRequestInput {
  const received = new Date();
  const due = new Date(received.getTime());
  due.setDate(due.getDate() + 30);
  return {
    requesterName: '',
    requestReceivedAt: received.toISOString().slice(0, 10),
    responseDueAt: due.toISOString().slice(0, 10),
    caseReference: '',
    identityVerified: false,
    requestScope: 'Auskunft nach Art. 15 DSGVO über die in Gremia.SBV verarbeiteten personenbezogenen Daten.',
    preparedBy: 'Schwerbehindertenvertretung'
  };
}

function safeText(value: string | undefined, fallback: string): string {
  const trimmed = (value ?? '').trim();
  return trimmed || fallback;
}

function dsarResponseBody(generatedAt: string, input: DataSubjectAccessRequestInput = defaultDsarInput()): string {
  const requesterName = safeText(input.requesterName, '<Name der anfragenden Person>');
  const caseReference = safeText(input.caseReference, '<Aktenzeichen / Fallbezug>');
  const preparedBy = safeText(input.preparedBy, 'Schwerbehindertenvertretung');
  const scope = safeText(input.requestScope, 'Auskunft nach Art. 15 DSGVO');
  const identityText = input.identityVerified
    ? 'Die Identität der anfragenden Person wurde geprüft.'
    : 'Die Identität ist vor Versand noch zu prüfen. Ohne Identitätsprüfung darf keine Auskunft erteilt werden.';

  return `${header('Antwort auf Auskunftsersuchen nach Art. 15 DSGVO', generatedAt)}
## 1. Vorgang

Anfragende Person: ${requesterName}

Fall-/Aktenbezug: ${caseReference}

Eingang des Ersuchens: ${safeText(input.requestReceivedAt, '<Datum Eingang>')}

Antwortfrist: ${safeText(input.responseDueAt, '<Fristdatum>')}

Bearbeitet durch: ${preparedBy}

Umfang des Ersuchens:

${scope}

Identitätsprüfung:

${identityText}

## 2. Antwortentwurf

Sehr geehrte*r ${requesterName},

Sie haben Auskunft nach Art. 15 DSGVO über die Verarbeitung Ihrer personenbezogenen Daten im Zusammenhang mit der Tätigkeit der Schwerbehindertenvertretung verlangt.

Nachfolgend erhalten Sie die strukturierte Auskunft zu den in Gremia.SBV geführten Informationen, soweit diese Ihrem Auskunftsersuchen und dem oben genannten Vorgang zugeordnet werden konnten.

## 3. Verarbeitungszwecke

Die Verarbeitung erfolgt zur Wahrnehmung der Aufgaben der Schwerbehindertenvertretung, insbesondere:

- Beratung und Unterstützung schwerbehinderter, gleichgestellter oder von Behinderung bedrohter Beschäftigter.
- Wahrnehmung von Beteiligungsrechten der SBV.
- Dokumentation von Fallbearbeitung, Fristen, Kontakten und Maßnahmen.
- Unterstützung bei Prävention, BEM, Gleichstellung/GdB und Kündigungsanhörungen.
- Nachweis ordnungsgemäßer SBV-Tätigkeit.

## 4. Kategorien personenbezogener Daten

Je nach Vorgang können folgende Datenkategorien verarbeitet sein:

| Kategorie | Möglicher Inhalt | Vorhanden / nicht vorhanden |
|---|---|---|
| Stammdaten / Fallbezug | Name, Pseudonym, Aktenzeichen, Organisationseinheit | ☐ vorhanden ☐ nicht vorhanden |
| Kontaktdaten | E-Mail, Telefon, interne/externe Ansprechpartner | ☐ vorhanden ☐ nicht vorhanden |
| Fallnotizen | Gesprächsnotizen, Anliegen, nächste Schritte | ☐ vorhanden ☐ nicht vorhanden |
| Fristen | Wiedervorlagen, Stellungnahmefristen, Reaktionsfristen | ☐ vorhanden ☐ nicht vorhanden |
| Präventionsdaten | Präventionsverfahren, Risiken, Maßnahmen | ☐ vorhanden ☐ nicht vorhanden |
| BEM-Daten | BEM-Angebot, Reaktion, Beteiligte, Maßnahmen | ☐ vorhanden ☐ nicht vorhanden |
| Gleichstellung/GdB | Antrag, Bescheid, Widerspruchsfrist, Verfahrensstand | ☐ vorhanden ☐ nicht vorhanden |
| Kündigungsanhörung | Arbeitgebervortrag, Schutzstatus, Integrationsamt, SBV-Stellungnahme | ☐ vorhanden ☐ nicht vorhanden |
| Dokumente / Vorlagen | erzeugte Schreiben, exportierte Unterlagen, interne Entwürfe | ☐ vorhanden ☐ nicht vorhanden |

## 5. Besondere Kategorien personenbezogener Daten

In SBV-Vorgängen können besondere Kategorien personenbezogener Daten nach Art. 9 DSGVO betroffen sein, insbesondere Gesundheitsdaten, Angaben zu Behinderung, Gleichstellung, BEM, GdB oder behinderungsbedingten Einschränkungen.

Bitte konkret eintragen:

- ☐ Es liegen keine besonderen Kategorien personenbezogener Daten vor.
- ☐ Es liegen besondere Kategorien personenbezogener Daten vor, nämlich: _______________________________

## 6. Empfänger oder Kategorien von Empfängern

Je nach Vorgang können Daten ausschließlich intern bei der SBV verbleiben oder zweckgebunden an folgende Stellen weitergegeben worden sein:

- betroffene Person selbst,
- Arbeitgeber / Personalbereich, soweit für Beteiligungsrechte erforderlich,
- Betriebsrat, soweit rechtlich und sachlich erforderlich,
- Integrationsamt / Inklusionsamt,
- Agentur für Arbeit,
- Betriebsarzt / arbeitsmedizinischer Dienst,
- externe Beratung oder Rechtsvertretung,
- IT-/Datenschutzstellen nur im Rahmen technischer Prüfung ohne fachlichen Fallzugriff.

Bitte konkret eintragen:

| Empfänger | Zweck | Datum / Vorgang |
|---|---|---|
|  |  |  |
|  |  |  |

## 7. Speicherdauer / Löschung

Die Daten werden nur so lange gespeichert, wie dies für die Aufgabenerfüllung der SBV, die Nachvollziehbarkeit laufender Verfahren, Fristen, Nachweiszwecke oder rechtliche Anforderungen erforderlich ist.

Für diesen Vorgang vorgesehene Prüfung:

| Datenbereich | Aufbewahrung erforderlich bis | Begründung |
|---|---|---|
| Fallakte |  |  |
| Fallnotizen |  |  |
| Fristen |  |  |
| Dokumente / Exporte |  |  |

## 8. Herkunft der Daten

Die Daten stammen je nach Vorgang aus folgenden Quellen:

- Angaben der betroffenen Person,
- Kommunikation mit Arbeitgeber / Personalbereich,
- Unterlagen aus Beteiligungsverfahren,
- Angaben von Behörden oder externen Stellen,
- eigene Dokumentation der SBV,
- erzeugte Schreiben und Notizen in Gremia.SBV.

## 9. Automatisierte Entscheidungsfindung

Eine automatisierte Entscheidungsfindung im Sinne von Art. 22 DSGVO findet in Gremia.SBV nicht statt. Die Software unterstützt Dokumentation, Fristen, Vorlagen und Auswertungen; fachliche Entscheidungen werden nicht automatisiert getroffen.

## 10. Rechte der betroffenen Person

Sie haben nach Maßgabe der DSGVO insbesondere folgende Rechte:

- Recht auf Berichtigung unrichtiger Daten,
- Recht auf Löschung, soweit keine Aufbewahrungs- oder Nachweisgründe entgegenstehen,
- Recht auf Einschränkung der Verarbeitung,
- Recht auf Datenübertragbarkeit, soweit anwendbar,
- Recht auf Beschwerde bei der zuständigen Datenschutzaufsichtsbehörde.

## 11. Anlagen zur Auskunft

Folgende Anlagen sollten vor Versand beigefügt oder als „nicht vorhanden“ dokumentiert werden:

- ☐ Auszug Fallstammdaten
- ☐ Auszug Fallnotizen
- ☐ Auszug Fristen
- ☐ Auszug Kontakte
- ☐ Auszug Prävention
- ☐ Auszug BEM
- ☐ Auszug Gleichstellung/GdB
- ☐ Auszug Kündigungsanhörung
- ☐ Dokumentenliste / Exportliste
- ☐ keine weiteren personenbezogenen Daten vorhanden

## 12. Interne Prüfliste vor Versand

- ☐ Identität geprüft
- ☐ Umfang des Ersuchens geklärt
- ☐ alle relevanten Module geprüft
- ☐ besondere Kategorien personenbezogener Daten geprüft
- ☐ Dritt- und Fremddaten geschwärzt
- ☐ Rechte und Freiheiten anderer Personen geprüft
- ☐ keine internen Rechts-/Strategievermerke unzulässig herausgegeben
- ☐ ExportGuard-Hinweise geprüft
- ☐ Antwortfrist eingehalten oder Fristverlängerung dokumentiert
- ☐ Versandweg sicher gewählt

## 13. Schlussformel

Mit freundlichen Grüßen

${preparedBy}
`;
}

export function renderDsarResponseDocument(input: DataSubjectAccessRequestInput): ComplianceDocument {
  const generatedAt = nowIso();
  const body = dsarResponseBody(generatedAt, input);
  return {
    type: 'dsar_response',
    title: 'Antwort auf DSGVO-Auskunftsersuchen',
    description: 'Strukturierte Antwort nach Art. 15 DSGVO mit Prüfliste und Anlagenübersicht.',
    filename: `gremia-sbv-dsgvo-auskunft-${generatedAt.slice(0, 10)}.md`,
    body,
    generatedAt
  };
}

export function renderComplianceDocument(type: ComplianceDocumentType): ComplianceDocument {
  const descriptor = COMPLIANCE_DOCUMENTS.find((item) => item.type === type);
  if (!descriptor) throw new Error(`Unknown compliance document type: ${type}`);

  const generatedAt = nowIso();
  const body = type === 'toms'
    ? tomsBody(generatedAt)
    : type === 'dsfa'
      ? dsfaBody(generatedAt)
      : type === 'dsgvo_bdsg_matrix'
        ? matrixBody(generatedAt)
        : type === 'dsar_response'
          ? dsarResponseBody(generatedAt)
          : approvalBody(generatedAt);

  return {
    type,
    title: descriptor.title,
    description: descriptor.description,
    filename: `gremia-sbv-${type}-${generatedAt.slice(0, 10)}.md`,
    body,
    generatedAt
  };
}

export function listComplianceDocuments(): ComplianceDocumentDescriptor[] {
  return COMPLIANCE_DOCUMENTS;
}
