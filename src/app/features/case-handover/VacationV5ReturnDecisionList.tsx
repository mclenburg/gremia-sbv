import type { VacationV5ReturnChoice, VacationV5ReturnReviewItem } from '../../../domain/transfer/vacationV5ReturnReview';
import { SelectInput } from '../../shared/components/IndustrialForm';
import { IndustrialRecordCard } from '../../shared/components/WorkbenchPanels';

const KIND_LABELS: Readonly<Record<string, string>> = {
  case: 'Fallakte', case_note: 'Fallnotiz', case_measure: 'Maßnahme',
  case_measure_note: 'Maßnahmennotiz', case_deadline: 'Fallfrist', case_document: 'Falldokument',
  protected_person: 'Person', deadline: 'Frist', meeting: 'Sitzung', meeting_agenda: 'Tagesordnungspunkt',
  recruiting: 'Bewerbungsverfahren', recruiting_interview: 'Vorstellungsgespräch',
  employer_obligation: 'Arbeitgeberpflicht', inclusion_officer: 'Inklusionsbeauftragte Person',
  inclusion_agreement: 'Inklusionsvereinbarung', inclusion_topic: 'Vereinbarungsthema',
  violation: 'Arbeitgeberverstoß', violation_event: 'Verstoßereignis', assembly: 'Versammlung',
  generated_document: 'Amtsdokument', workflow_document_link: 'Dokumentbezug',
  violation_document_link: 'Verstoßdokumentbezug',
};
const FIELD_LABELS: Readonly<Record<string, string>> = {
  title: 'Titel', display_name: 'Bezeichnung', subject: 'Betreff', status: 'Status',
  description: 'Beschreibung', summary: 'Zusammenfassung', notes: 'Notizen',
  starts_at: 'Beginn', due_at: 'Fälligkeit', filename: 'Dateiname',
  vacancy_title: 'Stelle', finding: 'Feststellung', content: 'Inhalt',
};
const ROW_KINDS = new Set(['protected_person', 'case', 'case_measure', 'case_note', 'case_measure_note', 'case_deadline', 'deadline',
  'meeting', 'meeting_agenda', 'recruiting', 'recruiting_interview',
  'employer_obligation', 'inclusion_officer', 'inclusion_agreement', 'inclusion_topic',
  'violation', 'violation_event', 'assembly']);
const DOCUMENT_ADDITION_KINDS = new Set(['case_document', 'generated_document',
  'workflow_document_link', 'violation_document_link']);

function actionOptions(item: VacationV5ReturnReviewItem): Array<{ value: string; label: string }> {
  if (item.decision === 'review_removal') return [
    { value: '', label: 'Bitte entscheiden' },
    { value: 'acknowledge_cancellation', label: 'Stornowunsch zur Kenntnis nehmen (keine Löschung)' },
  ];
  const options = [{ value: '', label: 'Bitte entscheiden' }, { value: 'keep_origin', label: 'Ursprung behalten' }];
  if (DOCUMENT_ADDITION_KINDS.has(item.kind)) {
    if (item.kind === 'case_document' || item.kind === 'generated_document'
      || item.kind === 'workflow_document_link') {
      if (item.decision === 'propose_update') options.push({ value: 'accept_update',
        label: item.kind.endsWith('_link') ? 'Dokumentbezug ändern' : 'Dokumentänderung übernehmen' });
      if (item.decision === 'review_conflict' && item.expectedOriginSha256) {
        options.push({ value: 'accept_conflict_update',
          label: item.kind.endsWith('_link') ? 'Bezugs-Konflikt bewusst übernehmen' : 'Dokumentkonflikt bewusst übernehmen' });
      }
    }
    if (item.decision === 'review_addition') options.push({ value: 'accept_addition',
      label: item.kind.endsWith('_link') ? 'Neuen Dokumentbezug übernehmen' : 'Neues Dokument übernehmen' });
    return options;
  }
  if (!ROW_KINDS.has(item.kind)) return options;
  if (item.decision === 'propose_update') options.push({ value: 'accept_update', label: 'Änderung übernehmen' });
  if (item.decision === 'review_conflict' && item.expectedOriginSha256) {
    options.push({ value: 'accept_conflict_update', label: 'Konflikt bewusst übernehmen' });
  }
  if (item.decision === 'review_addition') {
    options.push({ value: 'accept_addition', label: 'Neuen Vorgang übernehmen' });
  }
  return options;
}

function dataView(data: VacationV5ReturnReviewItem['originData']) {
  if (!data) return <p className="industrial-message">Kein Datensatz vorhanden.</p>;
  return <dl>{Object.entries(data).map(([key, value]) => <div className="industrial-stack" key={key}>
    <dt>{FIELD_LABELS[key] ?? key.replaceAll('_', ' ')}</dt>
    <dd>{value === null || value === '' ? '—' : String(value)}</dd>
  </div>)}</dl>;
}

function itemLabel(item: VacationV5ReturnReviewItem, index: number): string {
  const data = item.deputyData ?? item.originData;
  const title = data && ['display_name', 'title', 'subject', 'vacancy_title', 'filename']
    .map((key) => data[key]).find((value) => typeof value === 'string' && value.trim());
  return title ? `${KIND_LABELS[item.kind] ?? 'Vorgang'}: ${String(title)}`
    : `${KIND_LABELS[item.kind] ?? 'Vorgang'} ${index + 1}`;
}

export function VacationV5ReturnDecisionList({ items, choices, onChange }: {
  items: VacationV5ReturnReviewItem[];
  choices: Record<string, VacationV5ReturnChoice['action'] | ''>;
  onChange: (ref: string, action: VacationV5ReturnChoice['action'] | '') => void;
}) {
  return <div className="industrial-stack" aria-label="Rückgabeänderungen">
    {items.map((item, index) => {
      const label = itemLabel(item, index);
      const decision = item.decision === 'review_conflict' ? 'Konflikt'
        : item.decision === 'review_addition' ? 'Neu'
          : item.decision === 'review_removal' ? 'Stornowunsch' : 'Änderung';
      return <IndustrialRecordCard key={item.ref} ariaLabel={`${label}: ${decision}`}>
        <div className="industrial-stack">
          <h3>{label} · {decision}</h3>
          <details><summary>Stand auf dieser Instanz ansehen</summary>{dataView(item.originData)}</details>
          {item.deputyData ? <details><summary>Stand der Vertretung ansehen</summary>
            {dataView(item.deputyData)}</details> : null}
          {item.cancellationReason ? <p>Begründung: {item.cancellationReason}</p> : null}
          {item.kind === 'case' && item.decision !== 'review_removal' && item.decision !== 'review_addition' ? <p>
            Bei Fallakten bleiben lokale Fallnummer, Personenbindung und Datenschutzstatus erhalten.
          </p> : null}
          {!ROW_KINDS.has(item.kind) && (!DOCUMENT_ADDITION_KINDS.has(item.kind)
            || item.kind === 'violation_document_link' && item.decision !== 'review_addition')
            && item.decision !== 'review_removal'
            ? <p>Dieser Inhalt kann derzeit nur zur Prüfung zurückgestellt werden.</p> : null}
          <SelectInput label={`Entscheidung für ${label}`} value={choices[item.ref] ?? ''}
            options={actionOptions(item)} onValueChange={(value) =>
              onChange(item.ref, value as VacationV5ReturnChoice['action'] | '')} required />
        </div>
      </IndustrialRecordCard>;
    })}
  </div>;
}
