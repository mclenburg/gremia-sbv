import type { DatabaseAdapter } from './databaseService.js';
import type { VacationV5ScopeCandidate, VacationV5ScopeKey } from '../src/domain/transfer/vacationV5File.js';

type Row = { id: string; label: string; detail: string; due_at: string | null; status: string;
  process_type?: string; process_id?: string | null };
type DocumentRow = { id: string; parent_id: string; filename: string | null; size_bytes: number | null;
  contains_health_data?: number | null };

const GROUPS: Array<{ key: VacationV5ScopeKey; sql: string }> = [
  { key: 'caseIds', sql: `SELECT id, case_number || ' · ' || display_name AS label,
    category || ' · ' || status AS detail, review_at AS due_at, status FROM cases
    WHERE status <> 'closed' ORDER BY review_at, case_number LIMIT 1001` },
  { key: 'standaloneDeadlineIds', sql: `SELECT id, title AS label,
    process_type || ' · ' || status AS detail, due_at, status, process_type, process_id FROM deadlines
    WHERE case_id IS NULL AND measure_id IS NULL AND person_id IS NULL
    AND status IN ('open', 'overdue', 'suspended') ORDER BY due_at, title LIMIT 1001` },
  { key: 'meetingIds', sql: `SELECT id, title AS label, meeting_type || ' · ' || status AS detail,
    starts_at AS due_at, status FROM sbv_meetings WHERE status NOT IN ('held', 'closed')
    ORDER BY starts_at, title LIMIT 1001` },
  { key: 'recruitingIds', sql: `SELECT id, vacancy_title AS label,
    COALESCE(vacancy_reference, '') || ' · ' || status AS detail, hearing_due_date AS due_at, status
    FROM recruiting_participations WHERE status <> 'closed' ORDER BY hearing_due_date, vacancy_title LIMIT 1001` },
  { key: 'employerObligationIds', sql: `SELECT id, obligation_key || ' · ' || period_year AS label,
    scope_key || ' · ' || status AS detail, COALESCE(follow_up_due_at, due_at) AS due_at, status
    FROM sbv_employer_obligation_reviews WHERE status NOT IN ('compliant', 'closed')
    ORDER BY due_at, obligation_key LIMIT 1001` },
  { key: 'inclusionAgreementIds', sql: `SELECT id, title AS label, status AS detail,
    review_due_at AS due_at, status FROM sbv_inclusion_agreements WHERE status <> 'superseded'
    ORDER BY review_due_at, title LIMIT 1001` },
  { key: 'violationIds', sql: `SELECT id, subject AS label, stage || ' · ' || status AS detail,
    follow_up_due_at AS due_at, status FROM sbv_participation_violations
    WHERE case_id IS NULL AND source_context_type = 'general_employer_practice'
      AND status NOT IN ('remedied', 'closed', 'withdrawn')
    ORDER BY follow_up_due_at, subject LIMIT 1001` },
  { key: 'assemblyIds', sql: `SELECT id, 'SBV-Versammlung ' || year AS label, status AS detail,
    scheduled_at AS due_at, status FROM sbv_assemblies WHERE status NOT IN ('held', 'closed', 'completed')
    ORDER BY scheduled_at, year LIMIT 1001` },
  { key: 'inclusionOfficerSnapshotId', sql: `SELECT id, COALESCE(name, 'Inklusionsbeauftragter') AS label,
    status AS detail, verified_at AS due_at, status FROM sbv_inclusion_officer_snapshots
    ORDER BY verified_at DESC, created_at DESC LIMIT 1001` },
];

const WORKFLOW_SCOPE: Record<string, VacationV5ScopeKey> = {
  meeting: 'meetingIds', assembly: 'assemblyIds', inclusion_agreement: 'inclusionAgreementIds',
  employer_obligation_review: 'employerObligationIds',
};
const PROCESS_SCOPE: Record<string, VacationV5ScopeKey> = {
  sbv_meeting: 'meetingIds', recruiting_participation: 'recruitingIds',
  employer_obligation_review: 'employerObligationIds', inclusion_agreement: 'inclusionAgreementIds',
  sbv_participation_violation: 'violationIds', sbv_assembly: 'assemblyIds',
};

function recommended(dueAt: string | null, expiresAt: string, scopeKey: VacationV5ScopeKey): boolean {
  if (scopeKey === 'inclusionOfficerSnapshotId') return false;
  if (!dueAt) return false;
  const date = Date.parse(dueAt);
  return Number.isFinite(date) && date <= Date.parse(expiresAt) && date >= Date.now() - 30 * 24 * 60 * 60 * 1000;
}

export function listVacationV5ScopeCandidates(database: DatabaseAdapter, expiresAt: string): VacationV5ScopeCandidate[] {
  if (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) {
    throw new Error('Bitte ein zukünftiges Vertretungsende wählen.');
  }
  const candidates: VacationV5ScopeCandidate[] = [];
  for (const group of GROUPS) {
    const rows = database.prepare<Row>(group.sql).all();
    if (rows.length > 1000) throw new Error('Zu viele offene Vorgänge. Bitte zunächst den Datenbestand eingrenzen.');
    for (const row of rows) candidates.push({ id: row.id, scopeKey: group.key, label: row.label,
      detail: row.detail, ...(row.due_at ? { dueAt: row.due_at } : {}),
      ...(row.process_type && row.process_id && PROCESS_SCOPE[row.process_type]
        ? { requiredParent: { scopeKey: PROCESS_SCOPE[row.process_type], id: row.process_id } } : {}),
      recommended: recommended(row.due_at, expiresAt, group.key), documents: [] });
  }
  const byKey = new Map(candidates.map((item) => [`${item.scopeKey}:${item.id}`, item]));
  const add = (key: VacationV5ScopeKey, row: DocumentRow) => {
    const owner = byKey.get(`${key}:${row.parent_id}`);
    if (!owner || owner.documents.some((document) => document.id === row.id)) return;
    owner.documents.push({ id: row.id, filename: row.filename || 'Dokument', sizeBytes: row.size_bytes ?? 0,
      containsHealthData: Boolean(row.contains_health_data) });
  };
  for (const row of database.prepare<DocumentRow>(`SELECT id, case_id AS parent_id, filename, size_bytes,
    contains_health_data FROM case_documents WHERE case_id IS NOT NULL ORDER BY created_at, id`).all()) add('caseIds', row);
  const workflow = database.prepare<DocumentRow & { owner_type: string }>(`SELECT d.id, l.owner_id AS parent_id,
    l.owner_type, d.filename, d.size_bytes FROM generated_documents d
    JOIN sbv_workflow_document_links l ON l.document_id = d.id
    WHERE d.case_id IS NULL ORDER BY d.created_at, d.id`).all();
  for (const row of workflow) {
    const key = WORKFLOW_SCOPE[row.owner_type];
    if (key) add(key, row);
  }
  for (const row of database.prepare<DocumentRow>(`SELECT d.id, l.violation_id AS parent_id,
    d.filename, d.size_bytes FROM generated_documents d
    JOIN sbv_participation_violation_documents l ON l.document_id = d.id
    WHERE d.case_id IS NULL ORDER BY d.created_at, d.id`).all()) add('violationIds', row);
  return candidates;
}
