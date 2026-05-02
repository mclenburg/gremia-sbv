import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DEFAULT_LEGAL_NORMS, knowledgeExportPreview, normMatchesQuery } from './knowledgePolicy.js';
import type {
  CaseLawRecord,
  CaseLegalReferenceRecord,
  CreateCaseLawInput,
  CreateLegalNormInput,
  CreateNormChecklistItemInput,
  CreateNormCommentInput,
  KnowledgeExportPreview,
  LegalNormRecord,
  LegalNormSearchInput,
  LinkLegalNormToCaseInput,
  NormChecklistItemRecord,
  NormCommentRecord,
  UpdateLegalNormInput
} from '../src/app/core/models/knowledge.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeOptional(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function stringifyTags(tags?: string[]): string {
  return JSON.stringify([...(tags ?? [])].map((tag) => tag.trim()).filter(Boolean));
}

function parseTags(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function mapNorm(row: any): LegalNormRecord {
  return {
    id: row.id,
    source: row.source,
    paragraph: row.paragraph,
    title: row.title,
    shortText: row.short_text,
    fullText: row.full_text ?? undefined,
    sbvMeaning: row.sbv_meaning ?? undefined,
    practiceNote: row.practice_note ?? undefined,
    typicalCases: row.typical_cases ?? undefined,
    deadlineRelevance: row.deadline_relevance ?? undefined,
    templateRelevance: row.template_relevance ?? undefined,
    tags: parseTags(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCaseReference(row: any): CaseLegalReferenceRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    caseNumber: row.case_number ?? undefined,
    legalNormId: row.legal_norm_id,
    paragraph: row.paragraph,
    source: row.source,
    title: row.title,
    note: row.note ?? undefined,
    createdAt: row.created_at
  };
}

function mapComment(row: any): NormCommentRecord {
  return {
    id: row.id,
    legalNormId: row.legal_norm_id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCaseLaw(row: any): CaseLawRecord {
  return {
    id: row.id,
    legalNormId: row.legal_norm_id,
    court: row.court,
    decisionDate: row.decision_date ?? undefined,
    fileNumber: row.file_number,
    shortHolding: row.short_holding,
    relevance: row.relevance ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapChecklistItem(row: any): NormChecklistItemRecord {
  return {
    id: row.id,
    legalNormId: row.legal_norm_id,
    text: row.text,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function ensureKnowledgeSchema(db: DatabaseAdapter): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS legal_norms (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      paragraph TEXT NOT NULL,
      title TEXT NOT NULL,
      short_text TEXT NOT NULL,
      full_text TEXT,
      sbv_meaning TEXT,
      practice_note TEXT,
      typical_cases TEXT,
      deadline_relevance TEXT,
      template_relevance TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(source, paragraph)
    );

    CREATE INDEX IF NOT EXISTS idx_legal_norms_source ON legal_norms(source);
    CREATE INDEX IF NOT EXISTS idx_legal_norms_paragraph ON legal_norms(paragraph);
    CREATE INDEX IF NOT EXISTS idx_legal_norms_title ON legal_norms(title);

    CREATE TABLE IF NOT EXISTS case_legal_references (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      legal_norm_id TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(case_id, legal_norm_id),
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
      FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_case_legal_references_case_id ON case_legal_references(case_id);
    CREATE INDEX IF NOT EXISTS idx_case_legal_references_norm_id ON case_legal_references(legal_norm_id);

    CREATE TABLE IF NOT EXISTS norm_comments (
      id TEXT PRIMARY KEY,
      legal_norm_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS norm_case_law (
      id TEXT PRIMARY KEY,
      legal_norm_id TEXT NOT NULL,
      court TEXT NOT NULL,
      decision_date TEXT,
      file_number TEXT NOT NULL,
      short_holding TEXT NOT NULL,
      relevance TEXT,
      source_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS norm_checklist_items (
      id TEXT PRIMARY KEY,
      legal_norm_id TEXT NOT NULL,
      text TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
    );
  `);
}

export class KnowledgeService {
  constructor(private readonly dbProvider: () => DatabaseAdapter) {}

  private getSafeDb(): DatabaseAdapter {
    const db = this.dbProvider();
    ensureKnowledgeSchema(db);
    this.seedDefaults(db);
    return db;
  }

  private seedDefaults(db: DatabaseAdapter): void {
    const timestamp = nowIso();
    DEFAULT_LEGAL_NORMS.forEach((norm) => {
      db.prepare(`
        INSERT INTO legal_norms (
          id, source, paragraph, title, short_text, sbv_meaning, practice_note, typical_cases, tags, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          source = excluded.source,
          paragraph = excluded.paragraph,
          title = excluded.title,
          short_text = excluded.short_text,
          sbv_meaning = COALESCE(legal_norms.sbv_meaning, excluded.sbv_meaning),
          practice_note = COALESCE(legal_norms.practice_note, excluded.practice_note),
          typical_cases = COALESCE(legal_norms.typical_cases, excluded.typical_cases),
          tags = excluded.tags,
          updated_at = excluded.updated_at
      `).run(
        norm.id,
        norm.source,
        norm.paragraph,
        norm.title,
        norm.shortText,
        norm.sbvMeaning,
        norm.practiceNote,
        norm.typicalCases,
        stringifyTags(norm.tags),
        timestamp,
        timestamp
      );

      norm.checklist.forEach((text, index) => {
        db.prepare(`
          INSERT INTO norm_checklist_items (id, legal_norm_id, text, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET text = excluded.text, sort_order = excluded.sort_order, updated_at = excluded.updated_at
        `).run(`${norm.id}-check-${index + 1}`, norm.id, text, index + 1, timestamp, timestamp);
      });
    });
  }

  async listNorms(filters: LegalNormSearchInput = {}): Promise<LegalNormRecord[]> {
    const db = this.getSafeDb();
    const rows = db.prepare<any>(`SELECT * FROM legal_norms ORDER BY source COLLATE NOCASE, paragraph COLLATE NOCASE LIMIT ?`).all(Math.min(filters.limit ?? 250, 500));
    const norms = rows.map(mapNorm);
    return norms.filter((norm) => (!filters.source || norm.source === filters.source) && normMatchesQuery({ ...norm, shortText: norm.shortText }, filters.query ?? ''));
  }

  async getNorm(id: string): Promise<LegalNormRecord | null> {
    const row = this.getSafeDb().prepare<any>('SELECT * FROM legal_norms WHERE id = ?').get(id);
    return row ? mapNorm(row) : null;
  }

  async createNorm(input: CreateLegalNormInput): Promise<LegalNormRecord> {
    const source = input.source.trim();
    const paragraph = input.paragraph.trim();
    const title = input.title.trim();
    const shortText = input.shortText.trim();
    if (!source || !paragraph || !title || !shortText) throw new Error('Quelle, Norm, Titel und Kurztext sind erforderlich.');
    const db = this.getSafeDb();
    const id = randomUUID();
    const timestamp = nowIso();
    db.prepare(`
      INSERT INTO legal_norms (id, source, paragraph, title, short_text, full_text, sbv_meaning, practice_note, typical_cases, deadline_relevance, template_relevance, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, source, paragraph, title, shortText, normalizeOptional(input.fullText), normalizeOptional(input.sbvMeaning), normalizeOptional(input.practiceNote), normalizeOptional(input.typicalCases), normalizeOptional(input.deadlineRelevance), normalizeOptional(input.templateRelevance), stringifyTags(input.tags), timestamp, timestamp
    );
    return (await this.getNorm(id))!;
  }

  async updateNorm(id: string, input: UpdateLegalNormInput): Promise<LegalNormRecord> {
    const db = this.getSafeDb();
    const before = db.prepare<any>('SELECT * FROM legal_norms WHERE id = ?').get(id);
    if (!before) throw new Error(`Norm nicht gefunden: ${id}`);
    const timestamp = nowIso();
    db.prepare(`
      UPDATE legal_norms SET
        source = ?, paragraph = ?, title = ?, short_text = ?, full_text = ?, sbv_meaning = ?, practice_note = ?, typical_cases = ?, deadline_relevance = ?, template_relevance = ?, tags = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.source?.trim() || before.source,
      input.paragraph?.trim() || before.paragraph,
      input.title?.trim() || before.title,
      input.shortText?.trim() || before.short_text,
      input.fullText === undefined ? before.full_text : normalizeOptional(input.fullText),
      input.sbvMeaning === undefined ? before.sbv_meaning : normalizeOptional(input.sbvMeaning),
      input.practiceNote === undefined ? before.practice_note : normalizeOptional(input.practiceNote),
      input.typicalCases === undefined ? before.typical_cases : normalizeOptional(input.typicalCases),
      input.deadlineRelevance === undefined ? before.deadline_relevance : normalizeOptional(input.deadlineRelevance),
      input.templateRelevance === undefined ? before.template_relevance : normalizeOptional(input.templateRelevance),
      input.tags === undefined ? before.tags : stringifyTags(input.tags),
      timestamp,
      id
    );
    return (await this.getNorm(id))!;
  }

  async linkNormToCase(input: LinkLegalNormToCaseInput): Promise<CaseLegalReferenceRecord> {
    const db = this.getSafeDb();
    const norm = db.prepare<any>('SELECT * FROM legal_norms WHERE id = ?').get(input.legalNormId);
    if (!norm) throw new Error('Rechtsnorm wurde nicht gefunden.');
    const caseRow = db.prepare<any>('SELECT id FROM cases WHERE id = ?').get(input.caseId);
    if (!caseRow) throw new Error('Fall wurde nicht gefunden.');
    const existing = db.prepare<any>(`SELECT clr.*, c.case_number, n.paragraph, n.source, n.title FROM case_legal_references clr JOIN legal_norms n ON n.id = clr.legal_norm_id LEFT JOIN cases c ON c.id = clr.case_id WHERE clr.case_id = ? AND clr.legal_norm_id = ?`).get(input.caseId, input.legalNormId);
    if (existing) return mapCaseReference(existing);
    const id = randomUUID();
    const timestamp = nowIso();
    db.prepare('INSERT INTO case_legal_references (id, case_id, legal_norm_id, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, input.caseId, input.legalNormId, normalizeOptional(input.note), timestamp);
    const row = db.prepare<any>(`SELECT clr.*, c.case_number, n.paragraph, n.source, n.title FROM case_legal_references clr JOIN legal_norms n ON n.id = clr.legal_norm_id LEFT JOIN cases c ON c.id = clr.case_id WHERE clr.id = ?`).get(id);
    return mapCaseReference(row);
  }

  async listCaseReferences(caseId: string): Promise<CaseLegalReferenceRecord[]> {
    const db = this.getSafeDb();
    const rows = db.prepare<any>(`SELECT clr.*, c.case_number, n.paragraph, n.source, n.title FROM case_legal_references clr JOIN legal_norms n ON n.id = clr.legal_norm_id LEFT JOIN cases c ON c.id = clr.case_id WHERE clr.case_id = ? ORDER BY n.source, n.paragraph`).all(caseId);
    return rows.map(mapCaseReference);
  }

  async unlinkNormFromCase(caseId: string, legalNormId: string): Promise<{ deleted: boolean }> {
    const db = this.getSafeDb();
    db.prepare('DELETE FROM case_legal_references WHERE case_id = ? AND legal_norm_id = ?').run(caseId, legalNormId);
    return { deleted: true };
  }

  async listComments(legalNormId: string): Promise<NormCommentRecord[]> {
    const rows = this.getSafeDb().prepare<any>('SELECT * FROM norm_comments WHERE legal_norm_id = ? ORDER BY updated_at DESC').all(legalNormId);
    return rows.map(mapComment);
  }

  async createComment(input: CreateNormCommentInput): Promise<NormCommentRecord> {
    const title = input.title.trim();
    const content = input.content.trim();
    if (!title || !content) throw new Error('Titel und Inhalt sind erforderlich.');
    const db = this.getSafeDb();
    const id = randomUUID();
    const timestamp = nowIso();
    db.prepare('INSERT INTO norm_comments (id, legal_norm_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, input.legalNormId, title, content, timestamp, timestamp);
    return mapComment(db.prepare<any>('SELECT * FROM norm_comments WHERE id = ?').get(id));
  }

  async listCaseLaw(legalNormId: string): Promise<CaseLawRecord[]> {
    const rows = this.getSafeDb().prepare<any>('SELECT * FROM norm_case_law WHERE legal_norm_id = ? ORDER BY decision_date DESC, court COLLATE NOCASE').all(legalNormId);
    return rows.map(mapCaseLaw);
  }

  async createCaseLaw(input: CreateCaseLawInput): Promise<CaseLawRecord> {
    if (!input.court.trim() || !input.fileNumber.trim() || !input.shortHolding.trim()) throw new Error('Gericht, Aktenzeichen und Kurzleitsatz sind erforderlich.');
    const db = this.getSafeDb();
    const id = randomUUID();
    const timestamp = nowIso();
    db.prepare('INSERT INTO norm_case_law (id, legal_norm_id, court, decision_date, file_number, short_holding, relevance, source_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, input.legalNormId, input.court.trim(), normalizeOptional(input.decisionDate), input.fileNumber.trim(), input.shortHolding.trim(), normalizeOptional(input.relevance), normalizeOptional(input.sourceUrl), timestamp, timestamp);
    return mapCaseLaw(db.prepare<any>('SELECT * FROM norm_case_law WHERE id = ?').get(id));
  }

  async listChecklist(legalNormId: string): Promise<NormChecklistItemRecord[]> {
    const rows = this.getSafeDb().prepare<any>('SELECT * FROM norm_checklist_items WHERE legal_norm_id = ? ORDER BY sort_order, text COLLATE NOCASE').all(legalNormId);
    return rows.map(mapChecklistItem);
  }

  async createChecklistItem(input: CreateNormChecklistItemInput): Promise<NormChecklistItemRecord> {
    const text = input.text.trim();
    if (!text) throw new Error('Checklistentext ist erforderlich.');
    const db = this.getSafeDb();
    const id = randomUUID();
    const timestamp = nowIso();
    db.prepare('INSERT INTO norm_checklist_items (id, legal_norm_id, text, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, input.legalNormId, text, input.sortOrder ?? 100, timestamp, timestamp);
    return mapChecklistItem(db.prepare<any>('SELECT * FROM norm_checklist_items WHERE id = ?').get(id));
  }

  async exportPreview(): Promise<KnowledgeExportPreview> {
    const countRow = this.getSafeDb().prepare<{ count: number }>('SELECT count(*) AS count FROM legal_norms').get();
    return knowledgeExportPreview(Number(countRow?.count ?? 0));
  }
}
