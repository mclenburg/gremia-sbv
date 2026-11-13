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
  title: 'Titel', display_name: 'Bezeichnung', case_number: 'Aktenzeichen', subject: 'Betreff',
  status: 'Status', category: 'Kategorie', priority: 'Priorität', description: 'Beschreibung',
  summary: 'Zusammenfassung', notes: 'Notizen', content: 'Inhalt', next_steps: 'Nächste Schritte',
  starts_at: 'Beginn', ends_at: 'Ende', due_at: 'Fälligkeit', reminder_at: 'Erinnerung',
  scheduled_at: 'Termin', follow_up_due_at: 'Wiedervorlage', review_due_at: 'Prüftermin',
  filename: 'Dateiname', display_title: 'Dokumenttitel', size_bytes: 'Dateigröße in Byte',
  sha256: 'Dokumentinhalt', vacancy_title: 'Stelle', vacancy_reference: 'Stellenkennung',
  finding: 'Feststellung', next_action: 'Nächste Handlung', location: 'Ort',
  department: 'Bereich', legal_basis: 'Rechtsgrundlage', own_position: 'SBV-Position',
  employer_position: 'Position des Arbeitgebers', council_position: 'Position des Gremiums',
  current_state: 'Aktueller Stand', sbv_target: 'Ziel der SBV', result_text: 'Ergebnis',
  cancellationReason: 'Begründung des Stornowunsches',
};
const HIDDEN_FIELDS = new Set(['created_at', 'updated_at',
  'source_instance_id', 'source_package_id', 'origin_instance_id', 'deputy_instance_id']);

function isTechnicalField(key: string): boolean {
  return HIDDEN_FIELDS.has(key) || key === 'id' || key === 'ref'
    || key === 'content_sha256'
    || /(^|_)(id|uuid|token|fingerprint|hash|nonce|signature)$/.test(key);
}

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replaceAll('_', ' ').replace(/^./, (letter) => letter.toLocaleUpperCase('de-DE'));
}

function fieldValue(key: string, value: string | number | boolean | null | undefined, side: 'origin' | 'deputy'): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'sha256') return side === 'origin' ? 'bisheriger Inhalt' : 'Inhalt der Vertretung';
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
  if (typeof value === 'number') return new Intl.NumberFormat('de-DE').format(value);
  if (/(_at|_date|_until)$/.test(key) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date.toLocaleString('de-DE');
  }
  return value;
}

function comparisonRows(item: VacationV5ReturnReviewItem): Array<{ key: string; label: string; origin: string; deputy: string }> {
  const origin = item.originData ?? {};
  const deputy = item.deputyData ?? {};
  return [...new Set([...Object.keys(origin), ...Object.keys(deputy)])]
    .filter((key) => !isTechnicalField(key) && origin[key] !== deputy[key])
    .map((key) => ({ key, label: fieldLabel(key),
      origin: fieldValue(key, origin[key], 'origin'), deputy: fieldValue(key, deputy[key], 'deputy') }));
}
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
  const options = [{ value: '', label: 'Bitte entscheiden' }, { value: 'keep_origin', label: 'Bisherigen Stand behalten' }];
  if (DOCUMENT_ADDITION_KINDS.has(item.kind)) {
    if (item.kind === 'case_document' || item.kind === 'generated_document'
      || item.kind === 'workflow_document_link') {
      if (item.decision === 'propose_update') options.push({ value: 'accept_update',
        label: item.kind.endsWith('_link') ? 'Dokumentbezug ändern' : 'Dokumentänderung übernehmen' });
      if (item.decision === 'review_conflict' && item.expectedOriginSha256) {
        options.push({ value: 'accept_conflict_update',
          label: item.kind.endsWith('_link') ? 'Dokumentbezug der Vertretung übernehmen' : 'Dokument der Vertretung übernehmen' });
      }
    }
    if (item.decision === 'review_addition') options.push({ value: 'accept_addition',
      label: item.kind.endsWith('_link') ? 'Neuen Dokumentbezug übernehmen' : 'Neues Dokument übernehmen' });
    return options;
  }
  if (!ROW_KINDS.has(item.kind)) return options;
  if (item.decision === 'propose_update') options.push({ value: 'accept_update', label: 'Stand der Vertretung übernehmen' });
  if (item.decision === 'review_conflict' && item.expectedOriginSha256) {
    options.push({ value: 'accept_conflict_update', label: 'Stand der Vertretung trotz Konflikt übernehmen' });
  }
  if (item.decision === 'review_addition') {
    options.push({ value: 'accept_addition', label: 'Neuen Vorgang übernehmen' });
  }
  return options;
}

function itemLabel(item: VacationV5ReturnReviewItem, index: number): string {
  const data = item.deputyData ?? item.originData;
  const title = data && ['display_name', 'case_number', 'title', 'subject', 'vacancy_title', 'filename']
    .map((key) => data[key]).find((value) => typeof value === 'string' && value.trim());
  return title ? `${KIND_LABELS[item.kind] ?? 'Vorgang'}: ${String(title)}`
    : `${KIND_LABELS[item.kind] ?? 'Vorgang'} ${index + 1}`;
}

export function returnDecisionSearchText(item: VacationV5ReturnReviewItem): string {
  return [itemLabel(item, 0),
    ...comparisonRows(item).flatMap((row) => [row.label, row.origin, row.deputy])]
    .join(' ').toLocaleLowerCase('de-DE');
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
      const rows = comparisonRows(item);
      return <IndustrialRecordCard key={item.ref} ariaLabel={`${label}: ${decision}`}>
        <div className="industrial-stack">
          <h3>{label} · {decision}</h3>
          {rows.length ? <div className="industrial-table-shell"><table className="industrial-table">
            <caption>Unterschiede für {label}</caption>
            <thead><tr><th>Angabe</th><th>Bisheriger Stand</th><th>Stand der Vertretung</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.key}><th scope="row">{row.label}</th>
              <td>{row.origin}</td><td>{row.deputy}</td></tr>)}</tbody>
          </table></div> : <p>Keine abweichenden Fachangaben angezeigt. Die Prüfung betrifft den gespeicherten Ausgangsstand.</p>}
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
