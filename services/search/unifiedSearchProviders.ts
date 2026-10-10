import type { DatabaseAdapter } from '../databaseService.js';
import { FREE_TEXT_SOURCES } from '../dsarPrefillSupport.js';
import { SEARCH_SOURCE_CATALOG, type SearchSourceDefinition } from './searchSourceCatalog.js';
import { CASE_SEARCH_PROVIDERS } from './searchProviders.js';

export interface UnifiedSearchDocument {
  sourceType: string;
  sourceId: string;
  module: string;
  sourceLabel: string;
  title: string;
  content: string;
  keywords: string;
  caseIds: string[];
  occurredAt?: string;
  updatedAt: string;
  extractionQuality: string;
  navigationKind: string;
  navigationId: string;
  navigationSubId?: string;
}

type Row = Record<string, unknown>;

const MANUAL_TEXT_FIELDS: Readonly<Record<string, readonly string[]>> = {
  case_legal_references: ['note'],
  case_note_links: ['label', 'accessible_label'],
  compliance_incidents: ['category', 'summary', 'affected_data_categories', 'immediate_measures', 'lessons_learned'],
  deadline_templates: ['title', 'confidential_title', 'description', 'legal_basis'],
  deadlines: ['title', 'confidential_title', 'description', 'legal_basis'],
  document_templates: ['title', 'description', 'subject', 'body', 'tags_json'],
  gremia_br_workspace_actions: ['action_type', 'target_body_name', 'purpose', 'status'],
  legal_norms: ['source', 'paragraph', 'title', 'short_text', 'full_text', 'sbv_meaning', 'practice_note', 'typical_cases', 'tags'],
  norm_comments: ['title', 'content'],
  norm_case_law: ['court', 'file_number', 'short_holding', 'relevance'],
  norm_checklist_items: ['text'],
  persons: ['first_name', 'last_name', 'display_name', 'department', 'email', 'phone', 'sb_status', 'marks', 'notes'],
  protected_persons: ['pseudonym_label', 'first_name', 'last_name', 'personnel_number', 'work_email', 'organizational_unit', 'location', 'protection_status', 'notes'],
  sbv_control_protocols: ['title', 'partner', 'topic', 'participants', 'legal_context', 'discussion', 'result', 'next_steps'],
  sbv_election_proposals: ['validity_status', 'invalid_reason'],
  sbv_election_board_sessions: ['participants_json', 'decisions_text'],
  sbv_election_events: ['event_type', 'actor_role', 'metadata_json_datensparsam'],
  sbv_elections: ['kind', 'trigger_reason', 'procedure_decision_note', 'eligibility_check_basis', 'legal_hold_reason', 'status'],
  sbv_resource_records: ['title', 'legal_basis', 'provider', 'participants', 'task_context', 'necessity_reason', 'employer_reaction', 'cost_note', 'notes'],
  template_renders: ['subject', 'body'],
  templates: ['title', 'category', 'body'],
};

const dsarFields = new Map(FREE_TEXT_SOURCES.map((source) => [source.table, source.textColumns]));

export function approvedFields(table: string): readonly string[] {
  return MANUAL_TEXT_FIELDS[table] ?? dsarFields.get(table) ?? [];
}

function string(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value);
}

function indexedText(row: Row, fields: readonly string[]): string {
  return fields.map((field) => string(row[field])).filter(Boolean).join(' ').slice(0, 300_000);
}

function sourceId(row: Row): string {
  return string(row.id || row.measure_id);
}

function tableExists(db: DatabaseAdapter, table: string): boolean {
  return Boolean(db.prepare<{ found: number }>("SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}

function linkedIds(db: DatabaseAdapter, sql: string, id: string): string[] {
  return db.prepare<{ case_id: string }>(sql).all(id).map((link) => link.case_id).filter(Boolean);
}

function caseIds(db: DatabaseAdapter, source: SearchSourceDefinition, row: Row): string[] {
  if (source.scope === 'standalone') return [];
  const id = sourceId(row);
  const direct = source.caseLink?.split('.');
  const directCase = direct?.[0] === source.table ? string(row[direct[1]]) : '';
  if (directCase) return [directCase];
  switch (source.sourceType) {
    case 'person':
      return [...new Set([
        ...linkedIds(db, "SELECT case_file_id AS case_id FROM person_case_links WHERE protected_person_id = ? AND link_state = 'active'", id),
        ...linkedIds(db, 'SELECT id AS case_id FROM cases WHERE protected_person_id = ?', id),
      ])];
    case 'legacy_person':
      return linkedIds(db, 'SELECT id AS case_id FROM cases WHERE person_id = ?', id);
    case 'contact':
      return [...new Set([
        ...linkedIds(db, 'SELECT case_id FROM case_contacts WHERE contact_id = ?', id),
        ...linkedIds(db, 'SELECT p.case_id FROM bem_process_contacts l JOIN bem_processes p ON p.id = l.process_id WHERE l.contact_id = ?', id),
        ...linkedIds(db, 'SELECT p.case_id FROM prevention_process_contacts l JOIN prevention_processes p ON p.id = l.process_id WHERE l.contact_id = ?', id),
      ])];
    case 'journal': {
      const links = db.prepare<{ target_type: string; target_id: string }>('SELECT target_type, target_id FROM activity_journal_links WHERE entry_id = ?').all(id);
      const cases = new Set<string>();
      for (const link of links) {
        const sql: Record<string, string> = {
          case: 'SELECT id AS case_id FROM cases WHERE id = ?',
          person: 'SELECT case_file_id AS case_id FROM person_case_links WHERE protected_person_id = ?',
          bem_process: 'SELECT case_id FROM bem_processes WHERE id = ?',
          prevention_process: 'SELECT case_id FROM prevention_processes WHERE id = ?',
          sbv_participation: 'SELECT case_id FROM sbv_participations WHERE id = ?',
          termination_hearing: 'SELECT case_id FROM termination_hearings WHERE id = ?',
          equalization_process: 'SELECT case_id FROM equalization_processes WHERE id = ?',
          deadline: 'SELECT case_id FROM deadlines WHERE id = ?',
          document: 'SELECT case_id FROM case_documents WHERE id = ?',
        };
        if (sql[link.target_type]) for (const caseId of linkedIds(db, sql[link.target_type], link.target_id)) cases.add(caseId);
        if (link.target_type === 'document') {
          for (const caseId of linkedIds(db, 'SELECT case_id FROM generated_documents WHERE id = ?', link.target_id)) cases.add(caseId);
        }
      }
      return [...cases];
    }
    case 'measure_participation':
      return linkedIds(db, 'SELECT case_id FROM case_measures WHERE id = ?', string(row.measure_id));
    case 'generated_document':
      return linkedIds(db, 'SELECT case_id FROM sbv_participation_violations WHERE id = ?', string(row.violation_id));
    case 'gremia_action':
      return linkedIds(db, 'SELECT case_id FROM generated_documents WHERE id = ?', string(row.local_document_id));
    case 'participation_violation':
      return [...new Set([
        ...linkedIds(db, 'SELECT case_id FROM case_measures WHERE id = ?', string(row.related_case_measure_id)),
        ...linkedIds(db, 'SELECT case_id FROM sbv_participations WHERE id = ?', string(row.related_participation_id)),
      ])];
    default:
      return [];
  }
}

function title(row: Row, source: SearchSourceDefinition): string {
  const names = ['title', 'display_title', 'display_name', 'subject', 'vacancy_title', 'name', 'pseudonym_label'];
  for (const field of names) if (string(row[field])) return string(row[field]);
  const personName = [string(row.first_name), string(row.last_name)].filter(Boolean).join(' ');
  if (personName) return personName;
  return `${source.module} · ${source.sourceType}`;
}

function childText(db: DatabaseAdapter, source: SearchSourceDefinition, id: string): string {
  const text: string[] = [];
  for (const child of source.childTables) {
    const fields = approvedFields(child);
    if (!fields.length || !tableExists(db, child)) continue;
    const foreignKeys = db.prepare<{ table: string; from: string }>(`PRAGMA foreign_key_list(${child})`).all();
    const link = foreignKeys.find((key) => key.table === source.table);
    if (!link) continue;
    const rows = db.prepare<Row>(`SELECT * FROM ${child} WHERE ${link.from} = ?`).all(id);
    for (const row of rows) text.push(indexedText(row, fields));
  }
  return text.filter(Boolean).join(' ').slice(0, 300_000);
}

export function collectUnifiedSearchDocuments(db: DatabaseAdapter, sourceTypes?: ReadonlySet<string>): UnifiedSearchDocument[] {
  const documents = new Map<string, UnifiedSearchDocument>();
  for (const provider of CASE_SEARCH_PROVIDERS) {
    if (sourceTypes && !sourceTypes.has(provider.sourceType)) continue;
    if (SEARCH_SOURCE_CATALOG.find((source) => source.sourceType === provider.sourceType)?.state === 'legacy') continue;
    if (!provider.requiredTables.every((table) => tableExists(db, table))) continue;
    for (const item of provider.collectAll(db)) {
      const key = JSON.stringify([item.sourceType, item.sourceId]);
      const existing = documents.get(key);
      if (existing) {
        if (!existing.caseIds.includes(item.caseId)) existing.caseIds.push(item.caseId);
        continue;
      }
      const catalog = SEARCH_SOURCE_CATALOG.find((source) => source.sourceType === item.sourceType);
      documents.set(key, {
        sourceType: item.sourceType, sourceId: item.sourceId, module: catalog?.module ?? 'Fallakten',
        sourceLabel: item.sourceLabel, title: item.title, content: item.content, keywords: item.keywords ?? '',
        caseIds: [item.caseId], occurredAt: item.occurredAt, updatedAt: item.updatedAt,
        extractionQuality: item.extractionQuality, navigationKind: item.navigationTarget.kind,
        navigationId: item.navigationTarget.id, navigationSubId: item.navigationTarget.subId,
      });
    }
  }
  for (const source of SEARCH_SOURCE_CATALOG.filter((entry) => entry.state === 'planned')) {
    if (sourceTypes && !sourceTypes.has(source.sourceType)) continue;
    if (!tableExists(db, source.table)) continue;
    const fields = approvedFields(source.table);
    if (!fields.length) throw new Error(`Für Suchquelle ${source.sourceType} fehlen freigegebene Textfelder.`);
    const columns = new Set(db.prepare<{ name: string }>(`PRAGMA table_info(${source.table})`).all().map((column) => column.name));
    if (!fields.some((field) => columns.has(field))) throw new Error(`Suchquelle ${source.sourceType} hat keine freigegebenen Textspalten.`);
    for (const row of db.prepare<Row>(`SELECT * FROM ${source.table}`).all()) {
      const id = sourceId(row);
      if (!id) continue;
      const linkedNorm = source.sourceType === 'case_legal_reference'
        ? db.prepare<Row>('SELECT * FROM legal_norms WHERE id = ?').get(string(row.legal_norm_id))
        : undefined;
      const content = [
        indexedText(row, fields),
        childText(db, source, id),
        linkedNorm ? indexedText(linkedNorm, approvedFields('legal_norms')) : '',
      ].filter(Boolean).join(' ').slice(0, 300_000);
      const key = JSON.stringify([source.sourceType, id]);
      documents.set(key, {
        sourceType: source.sourceType, sourceId: id, module: source.module, sourceLabel: source.module,
        title: title(row, source), content, keywords: '', caseIds: caseIds(db, source, row),
        occurredAt: string(row.occurred_at || row.created_at || row.entry_date) || undefined,
        updatedAt: string(row.updated_at || row.created_at) || new Date(0).toISOString(),
        extractionQuality: 'structured', navigationKind: source.navigation, navigationId: id,
      });
    }
  }
  return [...documents.values()];
}
