import type { DatabaseAdapter } from './databaseService.js';
import type { VacationV5ScopeSelection, VacationV5DeadlineReference } from '../src/domain/transfer/vacationV5ScopePolicy.js';
import { inspectVacationV5Scope } from '../src/domain/transfer/vacationV5ScopePolicy.js';
import { projectVacationV5Row, VACATION_V5_ROW_FIELDS } from './vacationV5RowPolicy.js';
import { createVacationV5Manifest, type VacationV5Manifest, type VacationV5Section, type VacationV5SectionItem } from './vacationV5SectionManifest.js';

type Row = Record<string, unknown> & { id: string };
type RowKind = keyof typeof VACATION_V5_ROW_FIELDS;

const ROOTS: Array<{ kind: RowKind; ids: keyof VacationV5ScopeSelection; prefix: string; closed: readonly string[] }> = [
  { kind: 'meeting', ids: 'meetingIds', prefix: 'meeting', closed: ['held', 'closed'] },
  { kind: 'recruiting', ids: 'recruitingIds', prefix: 'recruiting', closed: ['closed'] },
  { kind: 'employer_obligation', ids: 'employerObligationIds', prefix: 'obligation', closed: ['compliant', 'closed'] },
  { kind: 'inclusion_agreement', ids: 'inclusionAgreementIds', prefix: 'agreement', closed: ['superseded'] },
  { kind: 'violation', ids: 'violationIds', prefix: 'violation', closed: ['remedied', 'closed', 'withdrawn'] },
  { kind: 'assembly', ids: 'assemblyIds', prefix: 'assembly', closed: ['held', 'closed', 'completed'] },
];

const CHILDREN: Array<{ kind: RowKind; parent: RowKind; column: string; prefix: string }> = [
  { kind: 'meeting_agenda', parent: 'meeting', column: 'meeting_id', prefix: 'agenda' },
  { kind: 'recruiting_interview', parent: 'recruiting', column: 'recruiting_participation_id', prefix: 'interview' },
  { kind: 'inclusion_topic', parent: 'inclusion_agreement', column: 'agreement_id', prefix: 'topic' },
  { kind: 'violation_event', parent: 'violation', column: 'violation_id', prefix: 'violation_event' },
];

const PROCESS_PARENT: Readonly<Record<string, RowKind>> = {
  sbv_meeting: 'meeting', recruiting_participation: 'recruiting', employer_obligation_review: 'employer_obligation',
  inclusion_agreement: 'inclusion_agreement', sbv_participation_violation: 'violation', sbv_assembly: 'assembly',
};

function section(type: RowKind, items: VacationV5SectionItem[]): VacationV5Section | null {
  return items.length ? { type, schemaVersion: 1, count: items.length, items } : null;
}

function requireRow(database: DatabaseAdapter, kind: RowKind, id: string): Row {
  const table = VACATION_V5_ROW_FIELDS[kind].table;
  const result = database.prepare<Row>(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  if (!result) throw new Error(`Ausgewählter Vertretungsvorgang wurde nicht gefunden: ${kind}.`);
  return result;
}

function collectRoots(database: DatabaseAdapter, selection: VacationV5ScopeSelection,
  references: Map<RowKind, Map<string, string>>): VacationV5Section[] {
  const sections: VacationV5Section[] = [];
  for (const root of ROOTS) {
    const ids = selection[root.ids];
    if (!Array.isArray(ids)) throw new Error('Vertretungsauswahl ist ungültig.');
    const map = new Map<string, string>();
    const items = ids.map((id, index) => {
      const source = requireRow(database, root.kind, id);
      if (root.closed.includes(String(source.status))) throw new Error(`Der ausgewählte Vertretungsvorgang ist bereits abgeschlossen: ${root.kind}.`);
      if (root.kind === 'violation' && (source.case_id || source.source_context_type !== 'general_employer_practice'
        || source.related_recruiting_participation_id || source.related_deadline_id || source.related_activity_journal_entry_id
        || source.related_sbv_control_protocol_id || source.related_participation_id || source.related_case_measure_id
        || source.related_termination_hearing_id)) throw new Error('Beteiligungsverstoß enthält unaufgelöste Bezüge.');
      const ref = `${root.prefix}_${index + 1}`;
      map.set(id, ref);
      return { ref, data: projectVacationV5Row(root.kind, source) };
    });
    references.set(root.kind, map);
    const value = section(root.kind, items);
    if (value) sections.push(value);
  }
  return sections;
}

function collectChildren(database: DatabaseAdapter, references: Map<RowKind, Map<string, string>>): VacationV5Section[] {
  const sections: VacationV5Section[] = [];
  for (const child of CHILDREN) {
    const items: VacationV5SectionItem[] = [];
    for (const [parentId, parentRef] of references.get(child.parent) ?? []) {
      const table = VACATION_V5_ROW_FIELDS[child.kind].table;
      const rows = database.prepare<Row>(`SELECT * FROM ${table} WHERE ${child.column} = ? ORDER BY id`).all(parentId);
      for (const source of rows) items.push({ ref: `${child.prefix}_${items.length + 1}`, parentRef, data: projectVacationV5Row(child.kind, source) });
    }
    const value = section(child.kind, items);
    if (value) sections.push(value);
  }
  return sections;
}

function collectDeadlines(database: DatabaseAdapter, ids: readonly string[],
  references: Map<RowKind, Map<string, string>>): VacationV5Section | null {
  const items = ids.map((id, index) => {
    const source = requireRow(database, 'deadline', id);
    const parentKind = PROCESS_PARENT[String(source.process_type)];
    const parentRef = parentKind ? references.get(parentKind)?.get(String(source.process_id)) : undefined;
    return { ref: `deadline_${index + 1}`, ...(parentRef ? { parentRef } : {}), data: projectVacationV5Row('deadline', source) };
  });
  return section('deadline', items);
}

export function collectVacationV5Sections(database: DatabaseAdapter, selection: VacationV5ScopeSelection): {
  sections: VacationV5Section[]; manifest: VacationV5Manifest;
} {
  const deadlines = selection.standaloneDeadlineIds.map((id) => {
    const source = database.prepare<Row>('SELECT * FROM deadlines WHERE id = ?').get(id);
    if (!source) return undefined;
    return { id, caseId: source.case_id ?? null, measureId: source.measure_id ?? null, personId: source.person_id ?? null,
      processType: String(source.process_type), processId: source.process_id ?? null, status: String(source.status) } as VacationV5DeadlineReference;
  }).filter((value): value is VacationV5DeadlineReference => value !== undefined);
  const inspection = inspectVacationV5Scope(selection, deadlines);
  if (inspection.issues.length) throw new Error(`Vertretungsauswahl enthält eine unaufgelöste Abhängigkeit oder einen unzulässigen Vorgang: ${inspection.issues.map((issue) => issue.code).join(', ')}.`);
  const references = new Map<RowKind, Map<string, string>>();
  const sections = [...collectRoots(database, selection, references), ...collectChildren(database, references)];
  if (selection.inclusionOfficerSnapshotId) {
    sections.push({ type: 'inclusion_officer', schemaVersion: 1, count: 1, items: [{ ref: 'officer_1',
      data: projectVacationV5Row('inclusion_officer', requireRow(database, 'inclusion_officer', selection.inclusionOfficerSnapshotId)) }] });
  }
  const deadlineSection = collectDeadlines(database, selection.standaloneDeadlineIds, references);
  if (deadlineSection) sections.push(deadlineSection);
  const manifest = createVacationV5Manifest(sections);
  return { sections, manifest };
}
