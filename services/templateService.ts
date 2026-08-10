import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DEFAULT_TEMPLATES } from './templateDefaults.js';
import { buildFallbackTemplateContext, normalizeTemplateKey, renderTemplateText, type TemplateContext } from './templatePolicy.js';
import type { CreateTemplateInput, RenderContextTemplateInput, RenderTemplateInput, RenderedTemplateResult, TemplateCategory, TemplateListFilters, TemplateRecord, UpdateTemplateInput } from '../src/app/core/models/template.model.js';

/** SQLite row at the persistence boundary. Values remain scalar and must be
 * normalized by the service mapper before entering the domain model. */
type DatabaseScalar = string;
type DatabaseRow = Record<string, DatabaseScalar>;

function nowIso(): string {
  return new Date().toISOString();
}

function optionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function jsonString(value: string[] | undefined): string {
  return JSON.stringify(value ?? []);
}

function parseJsonArray(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapTemplate(row: DatabaseRow | undefined): TemplateRecord {
  if (!row) throw new Error('Vorlage wurde nicht gefunden.');
  return {
    id: row.id,
    key: row.template_key,
    title: row.title,
    category: row.category as TemplateCategory,
    description: row.description ?? undefined,
    subject: row.subject,
    body: row.body,
    legalBasis: parseJsonArray(row.legal_basis_json),
    tags: parseJsonArray(row.tags_json),
    isSystem: Boolean(row.is_system),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function defaultTemplates(): CreateTemplateInput[] {
  return DEFAULT_TEMPLATES.map((template) => ({ ...template, legalBasis: [...(template.legalBasis ?? [])], tags: [...(template.tags ?? [])] }));
}

function likePattern(query: string): string {
  return `%${query.trim().replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}


function categoryForMeasureType(measureType: string | undefined): string | null {
  if (!measureType) return null;
  const map: Record<string, string> = {
    bem: 'bem',
    prevention: 'praevention',
    sbv_participation: 'beteiligung',
    termination_hearing: 'kuendigung',
    equalization_gdb: 'gleichstellung',
    workplace_accommodation: 'praevention',
    other: 'sonstiges'
  };
  return map[measureType] ?? null;
}

export class TemplateService {
  constructor(private readonly dbProvider: () => DatabaseAdapter) {}

  private get db(): DatabaseAdapter { return this.dbProvider(); }

  ensureSchema(db: DatabaseAdapter): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS document_templates (
        id TEXT PRIMARY KEY,
        template_key TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        legal_basis_json TEXT NOT NULL DEFAULT '[]',
        tags_json TEXT NOT NULL DEFAULT '[]',
        is_system INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS template_renders (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
        case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
      CREATE INDEX IF NOT EXISTS idx_template_renders_case ON template_renders(case_id, created_at);
    `);
    this.seedDefaults(db);
  }

  seedReferenceData(db = this.dbProvider()): void {
    this.seedDefaults(db);
  }

  private seedDefaults(db: DatabaseAdapter): void {
    const timestamp = nowIso();
    const insert = db.prepare(`
      INSERT OR IGNORE INTO document_templates (
        id, template_key, title, category, description, subject, body, legal_basis_json, tags_json, is_system, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    defaultTemplates().forEach((template) => {
      insert.run(
        randomUUID(),
        template.key ?? normalizeTemplateKey(template.title),
        template.title,
        template.category,
        optionalText(template.description),
        template.subject,
        template.body,
        jsonString(template.legalBasis),
        jsonString(template.tags),
        timestamp,
        timestamp
      );
    });
  }

  async listTemplates(filters: TemplateListFilters = {}): Promise<TemplateRecord[]> {
    const db = this.db;
    const query = filters.query?.trim();
    const category = filters.category ?? categoryForMeasureType(filters.measureType) ?? null;
    const contextualTag = filters.measureType ?? null;
    const limit = Math.min(Math.max(filters.limit ?? 200, 1), 500);

    if (query) {
      const pattern = likePattern(query);
      const rows = db.prepare<DatabaseRow>(`
        SELECT * FROM document_templates
        WHERE (? IS NULL OR category = ?)
          AND (? IS NULL OR tags_json LIKE '%' || ? || '%' OR category = ?)
          AND (? = 1 OR is_system = 0)
          AND (
            title LIKE ? ESCAPE '\\'
            OR COALESCE(description, '') LIKE ? ESCAPE '\\'
            OR subject LIKE ? ESCAPE '\\'
            OR body LIKE ? ESCAPE '\\'
            OR legal_basis_json LIKE ? ESCAPE '\\'
            OR tags_json LIKE ? ESCAPE '\\'
          )
        ORDER BY is_system DESC, category, title COLLATE NOCASE
        LIMIT ?
      `).all(category, category, contextualTag, contextualTag, category, filters.includeSystem === false ? 0 : 1, pattern, pattern, pattern, pattern, pattern, pattern, limit);
      return rows.map(mapTemplate);
    }

    const rows = db.prepare<DatabaseRow>(`
      SELECT * FROM document_templates
      WHERE (? IS NULL OR category = ?)
        AND (? IS NULL OR tags_json LIKE '%' || ? || '%' OR category = ?)
        AND (? = 1 OR is_system = 0)
      ORDER BY is_system DESC, category, title COLLATE NOCASE
      LIMIT ?
    `).all(category, category, contextualTag, contextualTag, category, filters.includeSystem === false ? 0 : 1, limit);
    return rows.map(mapTemplate);
  }

  async createTemplate(input: CreateTemplateInput): Promise<TemplateRecord> {
    const title = input.title.trim();
    const subject = input.subject.trim();
    const body = input.body.trim();
    if (!title) throw new Error('Bitte einen Titel erfassen.');
    if (!subject) throw new Error('Bitte einen Betreff erfassen.');
    if (!body) throw new Error('Bitte einen Vorlagentext erfassen.');

    const db = this.db;
    const id = randomUUID();
    const timestamp = nowIso();
    db.prepare(`
      INSERT INTO document_templates (
        id, template_key, title, category, description, subject, body, legal_basis_json, tags_json, is_system, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      input.key?.trim() || `${normalizeTemplateKey(title)}-${Date.now()}`,
      title,
      input.category,
      optionalText(input.description),
      subject,
      body,
      jsonString(input.legalBasis),
      jsonString(input.tags),
      timestamp,
      timestamp
    );
    return mapTemplate(db.prepare<DatabaseRow>('SELECT * FROM document_templates WHERE id = ?').get(id));
  }

  async updateTemplate(id: string, input: UpdateTemplateInput): Promise<TemplateRecord> {
    const db = this.db;
    const before = db.prepare<DatabaseRow>('SELECT * FROM document_templates WHERE id = ?').get(id);
    if (!before) throw new Error('Vorlage nicht gefunden.');
    if (before.is_system) throw new Error('Systemvorlagen können nicht überschrieben werden. Bitte eigene Vorlage anlegen.');

    db.prepare(`
      UPDATE document_templates SET
        title = ?, category = ?, description = ?, subject = ?, body = ?, legal_basis_json = ?, tags_json = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.title?.trim() || before.title,
      input.category ?? before.category,
      input.description === undefined ? before.description : optionalText(input.description),
      input.subject?.trim() || before.subject,
      input.body?.trim() || before.body,
      input.legalBasis === undefined ? before.legal_basis_json : jsonString(input.legalBasis),
      input.tags === undefined ? before.tags_json : jsonString(input.tags),
      nowIso(),
      id
    );
    return mapTemplate(db.prepare<DatabaseRow>('SELECT * FROM document_templates WHERE id = ?').get(id));
  }

  async deleteTemplate(id: string): Promise<{ deleted: boolean }> {
    const db = this.db;
    const before = db.prepare<DatabaseRow>('SELECT is_system FROM document_templates WHERE id = ?').get(id);
    if (!before) return { deleted: false };
    if (before.is_system) throw new Error('Systemvorlagen können nicht gelöscht werden.');
    const result = db.prepare<DatabaseRow>('DELETE FROM document_templates WHERE id = ?').run(id) as { changes?: number } | undefined;
    return { deleted: Boolean(result?.changes) };
  }

  async renderTemplate(input: RenderTemplateInput): Promise<RenderedTemplateResult> {
    const db = this.db;
    const templateRow = db.prepare<DatabaseRow>('SELECT * FROM document_templates WHERE id = ?').get(input.templateId);
    if (!templateRow) throw new Error('Vorlage nicht gefunden.');
    const template = mapTemplate(templateRow);
    const context = this.buildContext(db, input.caseId, input.values);
    const subjectResult = renderTemplateText(template.subject, context);
    const bodyResult = renderTemplateText(template.body, context);
    const renderedAt = nowIso();
    let archivedId: string | undefined;

    if (input.archive !== false) {
      archivedId = randomUUID();
      db.prepare(`
        INSERT INTO template_renders (id, template_id, case_id, subject, body, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(archivedId, template.id, input.caseId ?? null, subjectResult.text, bodyResult.text, renderedAt);
    }

    return {
      templateId: template.id,
      title: template.title,
      subject: subjectResult.text,
      body: bodyResult.text,
      caseId: input.caseId,
      archivedId,
      unresolvedPlaceholders: [...new Set([...subjectResult.unresolvedPlaceholders, ...bodyResult.unresolvedPlaceholders])].sort((a, b) => a.localeCompare(b)),
      renderedAt
    };
  }

  async renderContextTemplate(input: RenderContextTemplateInput): Promise<RenderedTemplateResult> {
    const db = this.db;
    const template = db.prepare<DatabaseRow>('SELECT * FROM document_templates WHERE template_key = ?').get(input.templateKey);
    if (!template) throw new Error(`Vorlage nicht gefunden: ${input.templateKey}`);
    const sourceValues = this.buildSourceContext(db, input);
    return this.renderTemplate({
      templateId: template.id,
      caseId: input.caseId,
      archive: input.archive,
      values: {
        ...sourceValues,
        ...(input.values ?? {})
      }
    });
  }

  private buildSourceContext(db: DatabaseAdapter, input: RenderContextTemplateInput): Record<string, string> {
    const values: Record<string, string> = {};
    if (input.sourceLabel) values['quelle.bezeichnung'] = input.sourceLabel;
    if (input.sourceType) values['quelle.typ'] = input.sourceType;

    if (input.sourceType === 'prevention' && input.sourceId && this.tableExists(db, 'prevention_processes')) {
      const row = db.prepare<DatabaseRow>('SELECT * FROM prevention_processes WHERE id = ?').get(input.sourceId);
      if (row) {
        values['praevention.status'] = row.status ?? '';
        values['praevention.gefaehrdung'] = row.risk_type ?? '';
        values['praevention.schwierigkeit'] = row.difficulty_type ?? '';
        values['praevention.erste_kenntnis'] = row.first_knowledge_at ? new Date(row.first_knowledge_at).toLocaleDateString('de-DE') : '';
        values['praevention.arbeitgeberfrist'] = row.employer_response_due_at ? new Date(row.employer_response_due_at).toLocaleDateString('de-DE') : '';
        values['frist.datum'] = values['frist.datum'] || values['praevention.arbeitgeberfrist'];
      }
    }

    return values;
  }

  private buildContext(db: DatabaseAdapter, caseId?: string, values: Record<string, string> = {}): TemplateContext {
    const context: TemplateContext = { ...buildFallbackTemplateContext(), ...values };
    if (caseId) {
      const caseRow = db.prepare<DatabaseRow>('SELECT * FROM cases WHERE id = ?').get(caseId);
      if (caseRow) {
        context['fall.id'] = caseRow.id;
        context['fall.aktenzeichen'] = caseRow.case_number;
        context['fall.name'] = caseRow.display_name;
        context['person.name'] = caseRow.display_name;
        context['fall.kategorie'] = caseRow.category;
        context['fall.status'] = caseRow.status;
        context['fall.kurzbeschreibung'] = caseRow.summary ?? '';
        context['fall.risiko'] = caseRow.risk_level ?? '';
      }

      if (this.tableExists(db, 'case_legal_references') && this.tableExists(db, 'legal_norms')) {
        const norms = db.prepare<DatabaseRow>(`
          SELECT n.paragraph, n.source
          FROM case_legal_references r
          JOIN legal_norms n ON n.id = r.legal_norm_id
          WHERE r.case_id = ?
          ORDER BY n.source, n.paragraph
        `).all(caseId);
        context.normen = norms.map((row) => `${row.paragraph} ${row.source}`).join(', ');
      }
    }
    return context;
  }

  private tableExists(db: DatabaseAdapter, table: string): boolean {
    return Boolean(db.prepare<{ found: number }>('SELECT 1 AS found FROM sqlite_master WHERE type IN (\'table\', \'view\') AND name = ?').get(table));
  }
}
