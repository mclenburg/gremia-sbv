import type { DataSubjectAccessRequestInput } from '../models/compliance.model.js';
import { header } from './complianceDocumentSupport.js';

function displayDateTime(value: string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
export function dsarCell(value: unknown): string {
  const text = String(value ?? '—').trim() || '—';
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}
function dsarTable<T>(headers: string[], rows: T[], map: (row: T) => unknown[]): string {
  if (!rows.length) return 'Keine automatisch zugeordneten Datensätze gefunden.';
  return `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map((row) => `| ${map(row).map(dsarCell).join(' | ')} |`).join('\n')}`;
}
export function dsarPrefillBody(input: DataSubjectAccessRequestInput): string {
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
export function dsarBody(input: DataSubjectAccessRequestInput, generatedAt: string): string {
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
