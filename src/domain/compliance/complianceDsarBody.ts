import type {
  DataSubjectAccessPrefill,
  DataSubjectAccessRequestInput,
  DataSubjectAccessReviewItem,
  DataSubjectAccessSourceInventoryItem,
} from '../models/compliance.model.js';
import {
  buildDataSubjectAccessReadiness,
  preferredPrivacyContactLabel,
  privacyContactRoleLabel,
} from './dataSubjectAccessPolicy.js';
import { displayDateTime } from './complianceDocumentSupport.js';

function safeDateTime(value: string): string {
  if (!value.trim()) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return displayDateTime(date.toISOString());
}

export function dsarCell(value: unknown): string {
  const text = String(value ?? '—').trim() || '—';
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function dsarTable<T>(headers: string[], rows: T[], map: (row: T) => unknown[]): string {
  if (!rows.length) return 'Keine zugeordneten Datensätze gefunden.';
  return `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map((row) => `| ${map(row).map(dsarCell).join(' | ')} |`).join('\n')}`;
}

function lineList(values: string[]): string {
  if (!values.length) return '- —';
  return values.map((value) => `- ${value}`).join('\n');
}

function statusLabel(status: DataSubjectAccessSourceInventoryItem['status']): string {
  if (status === 'found') return 'Treffer';
  if (status === 'not_available') return 'Quelle nicht verfügbar';
  return 'keine Treffer';
}

function releaseModeLabel(mode: DataSubjectAccessSourceInventoryItem['releaseMode']): string {
  if (mode === 'direct_summary') return 'strukturierte Zusammenfassung';
  if (mode === 'metadata_only') return 'Metadaten / Prüfhinweis';
  return 'manuelle Prüfung erforderlich';
}

function readinessBody(input: DataSubjectAccessRequestInput): string {
  const readiness = buildDataSubjectAccessReadiness(input);
  return `## 2. Bearbeitungsstand

| Prüfschritt | Stand |
|---|---|
| Anfrage erfasst | ${input.requestReceivedAt ? 'Ja' : 'Nein'} |
| An Datenschutzkontakt / verantwortliche Stelle weitergeleitet | ${input.requestForwardedAt ? input.requestForwardedAt : 'noch offen'} |
| Identität / Berechtigung | ${input.identityVerified ? 'als geprüft dokumentiert' : 'durch Datenschutzkontakt / verantwortliche Stelle zu prüfen'} |
| SBV-Dateninventur | ${input.prefill ? `ausgeführt am ${safeDateTime(input.prefill.generatedAt)}` : 'noch offen'} |
| SBV-Prüfung | ${input.sbvReviewCompleted ? 'abgeschlossen' : 'noch offen'} |
| Übergabe dokumentiert | ${input.handedOverAt ? input.handedOverAt : 'noch offen'} |

${readiness.ready
    ? 'Die SBV-Zuarbeit ist nach aktuellem Stand vollständig vorbereitet. Die abschließende Herausgabeentscheidung liegt bei der verantwortlichen Stelle beziehungsweise dem Datenschutzkontakt.'
    : `**Noch offene Punkte:**\n\n${lineList(readiness.warnings)}\n\n**Nächste Schritte:**\n\n${lineList(readiness.nextActions)}`}
`;
}

function sourceInventoryBody(prefill?: DataSubjectAccessPrefill): string {
  if (!prefill) {
    return `## 4. Datenquelleninventur

Die SBV-Dateninventur wurde noch nicht ausgeführt. Ohne Inventur darf dieses Dokument nicht als vollständige Zuarbeit verwendet werden.
`;
  }
  return `## 4. Datenquelleninventur

${prefill.matchReason}

${dsarTable(
    ['Modul', 'Quelle', 'Status', 'Treffer', 'Ausgabemodus'],
    prefill.sourceInventory,
    (source) => [
      source.module,
      source.label,
      statusLabel(source.status),
      source.foundCount,
      releaseModeLabel(source.releaseMode),
    ],
  )}
`;
}

function legalInformationBody(prefill?: DataSubjectAccessPrefill): string {
  const relevantSources = (prefill?.sourceInventory ?? []).filter((source) => source.status !== 'not_available');
  return `## 5. Pflichtinformationen nach Art. 15 DSGVO

### 5.1 Verarbeitungszwecke

${lineList(Array.from(new Set(relevantSources.flatMap((source) => source.purposes))))}

### 5.2 Kategorien personenbezogener Daten

${lineList(Array.from(new Set(relevantSources.flatMap((source) => source.dataCategories))))}

### 5.3 Empfänger oder Empfängerkategorien

${lineList(Array.from(new Set(relevantSources.flatMap((source) => source.recipients))))}

### 5.4 Speicherdauer oder Kriterien

${dsarTable(['Quelle', 'Aufbewahrungsregel'], relevantSources, (source) => [source.label, source.retentionRule])}

### 5.5 Herkunft der Daten

${dsarTable(['Quelle', 'Herkunft'], relevantSources, (source) => [source.label, source.origin])}

### 5.6 Automatisierte Entscheidungen / Profiling

Gremia.SBV dokumentiert SBV-Arbeitsvorgänge lokal. Eine automatisierte Entscheidung im Sinne von Art. 22 DSGVO oder Profiling mit Rechtswirkung gegenüber der betroffenen Person ist in Gremia.SBV nicht vorgesehen.

### 5.7 Rechtehinweise

Die betroffene Person kann gegenüber der verantwortlichen Stelle Berichtigung, Löschung, Einschränkung der Verarbeitung oder Widerspruch verlangen, soweit die gesetzlichen Voraussetzungen vorliegen. Außerdem besteht das Recht auf Beschwerde bei einer Datenschutzaufsichtsbehörde.
`;
}

function structuredDataBody(input: DataSubjectAccessRequestInput): string {
  const prefill = input.prefill;
  if (!prefill) {
    return `## 6. Strukturierte personenbezogene Daten

Keine strukturierte Dateninventur vorhanden.
`;
  }

  return `## 6. Strukturierte personenbezogene Daten

### 6.1 Personenstamm / Schutzstatus

${dsarTable(['Name / Kennung', 'Personalnummer', 'E-Mail', 'Schutzstatus', 'Organisation', 'Standort', 'Status gültig bis', 'Lifecycle'], prefill.persons, (person) => [person.displayName, person.personnelNumber, person.workEmail, person.protectionStatus, person.organizationalUnit, person.location, person.statusValidUntil, person.lifecycleState])}

### 6.2 Fallakten

${dsarTable(['Aktenzeichen', 'Bezeichnung', 'Kategorie', 'Status', 'Priorität', 'Eröffnet', 'Geschlossen'], prefill.cases, (record) => [record.caseNumber, record.displayName, record.category, record.status, record.priority, record.openedAt, record.closedAt])}

### 6.3 Fristen und Wiedervorlagen

${dsarTable(['Titel', 'Prozess', 'Art', 'Status', 'Fälligkeit', 'Rechtsgrundlage'], prefill.deadlines, (deadline) => [deadline.title, deadline.processType, deadline.deadlineType, deadline.status, deadline.dueAt, deadline.legalBasis])}

### 6.4 Maßnahmen und Prozessmodule

${dsarTable(['Titel', 'Typ', 'Status', 'Risiko', 'Eröffnet', 'Fällig', 'Nachverfolgung'], prefill.measures, (measure) => [measure.title, measure.type, measure.status, measure.riskLevel, measure.openedAt, measure.dueAt, measure.requiresFollowUp ? 'Ja' : 'Nein'])}

### 6.5 Arbeitgeberlisten-Importe

${dsarTable(['Quelle', 'Importiert am', 'Importaktion', 'Geänderte Felder'], prefill.importRuns, (run) => [run.sourceFileName, run.importedAt, run.action, run.changedFields.join(', ') || '—'])}

### 6.6 Datensparsame Lifecycle- und Audit-Ereignisse

${dsarTable(['Zeitpunkt', 'Aktion', 'Betreff', 'Zweck'], prefill.lifecycleEvents, (event) => [event.occurredAt, event.action, event.subjectType, event.purpose])}
`;
}

function reviewRecommendationLabel(value: DataSubjectAccessReviewItem['recommendation']): string {
  if (value === 'include_summary') return 'zusammenfassen';
  if (value === 'metadata_only') return 'nur Metadaten';
  if (value === 'exclude_third_party') return 'wegen Drittdaten ausschließen';
  return 'vor Herausgabe schwärzen/prüfen';
}

function reviewBody(input: DataSubjectAccessRequestInput): string {
  const prefill = input.prefill;
  if (!prefill) {
    return `## 7. Prüfliste für Schwärzung und Herausgabe

Keine Prüfliste vorhanden, weil noch keine Dateninventur ausgeführt wurde.
`;
  }
  return `## 7. Prüfliste für Schwärzung und Herausgabe

Freitexte, Dokumentinhalte, Wahlunterlagen, Bewerberdaten, Gremienbezüge und Daten anderer Personen dürfen nicht ungeprüft an die betroffene Person herausgegeben werden. Die folgende Liste ist die interne SBV-Prüfliste für Datenschutzkontakt oder verantwortliche Stelle.

${dsarTable(['Quelle', 'Titel', 'Fall/Bezug', 'Empfehlung', 'Grund', 'Auszug'], prefill.reviewItems, (item) => [item.sourceLabel, item.title, item.caseReference, reviewRecommendationLabel(item.recommendation), item.reason, item.excerpt])}
`;
}

function handoverBody(input: DataSubjectAccessRequestInput): string {
  return `## 8. Übergabe und Signatur

Diese Unterlage ist eine SBV-Zuarbeit zur Bearbeitung eines Auskunftsersuchens nach Art. 15 DSGVO. Die abschließende Prüfung, Berechtigungs-/Identitätsbewertung und Herausgabeentscheidung erfolgt durch die verantwortliche Stelle beziehungsweise den zuständigen Datenschutzkontakt.

Übergabe an: ${preferredPrivacyContactLabel(input)}

${input.privacyContactEmail ? `Kontakt-E-Mail: ${input.privacyContactEmail}\n\n` : ''}${input.handedOverAt ? `Übergeben am: ${input.handedOverAt}\n\n` : ''}${input.preparedBy || 'Schwerbehindertenvertretung'}
`;
}

export function dsarBody(input: DataSubjectAccessRequestInput, generatedAt: string): string {
  return `# SBV-Zuarbeit zur Art.-15-Auskunft

Erzeugt am: ${safeDateTime(generatedAt)}

Diese Unterlage sammelt die in Gremia.SBV gespeicherten personenbezogenen Datenbezüge zu einem Auskunftsersuchen nach Art. 15 DSGVO. Sie ist keine ungeprüfte Direktantwort an die betroffene Person.

## 1. Anfrage und Zuständigkeit

| Feld | Inhalt |
|---|---|
| Anfragende Person | ${input.requesterName || '—'} |
| Eindeutiger Personenbezug | ${input.subjectPersonId || 'nicht festgelegt'} |
| Eingang des Ersuchens | ${input.requestReceivedAt || '—'} |
| Frist zur Bearbeitung | ${input.responseDueAt || '—'} |
| Fall-/Aktenbezug | ${input.caseReference || '—'} |
| Umfang des Ersuchens | ${input.requestScope || 'nicht konkretisiert'} |
| Verantwortliche Stelle | ${input.responsibleEntity || 'nicht hinterlegt'} |
| Datenschutzkontakt | ${preferredPrivacyContactLabel(input)} |
| Kontaktrolle | ${privacyContactRoleLabel(input.privacyContactRole)} |
| Bearbeitet durch | ${input.preparedBy || '—'} |

${readinessBody(input)}
## 3. Zusammenfassung der SBV-Datenlage

${input.prefill
    ? `Gremia.SBV hat ${input.prefill.persons.length} Personenbezug/Personenbezüge, ${input.prefill.cases.length} Fallakte(n), ${input.prefill.deadlines.length} Frist(en), ${input.prefill.measures.length} Maßnahme(n), ${input.prefill.importRuns.length} Importbezug/Importbezüge, ${input.prefill.lifecycleEvents.length} Audit-/Lifecycle-Ereignis(se) und ${input.prefill.reviewItems.length} prüfpflichtige Fundstelle(n) ermittelt.`
    : 'Die Datenlage wurde noch nicht ermittelt.'}

${sourceInventoryBody(input.prefill)}
${legalInformationBody(input.prefill)}
${structuredDataBody(input)}
${reviewBody(input)}
${handoverBody(input)}
`;
}
