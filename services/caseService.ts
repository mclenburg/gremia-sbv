import fs from 'node:fs';
import path from 'node:path';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import yauzl from 'yauzl';
import type { CaseCategory, CasePriority, CaseRecord, CaseStatus, CreateCaseInput } from '../src/app/core/models/case.model.js';
import type { CaseDocumentRecord } from '../src/app/core/models/case-document.model.js';
import type {
  CaseContentSearchInput,
  CaseNoteRecord,
  CaseNoteType,
  CaseSearchResult,
  ConfidentialLevel,
  CreateCaseNoteInput,
  UpdateCaseNoteInput
} from '../src/app/core/models/case-note.model.js';
import type { DatabaseAdapter } from './databaseService.js';
import { ensureContactPrivacySchema, scanCaseNoteContactReferences } from './contactPrivacyService.js';

function nowIso(): string {
  return new Date().toISOString();
}

function mapCase(row: any): CaseRecord {
  return {
    id: row.id,
    caseNumber: row.case_number,
    displayName: row.display_name,
    category: row.category as CaseCategory,
    status: row.status as CaseStatus,
    priority: row.priority as CasePriority,
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? undefined,
    summary: row.summary ?? undefined,
    isPseudonymized: Boolean(row.is_pseudonymized),
    isLocked: Boolean(row.is_locked)
  };
}

function splitCsv(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  return value.split(',').map((part) => part.trim()).filter(Boolean);
}

function mapNote(row: any): CaseNoteRecord {
  const caseIds = splitCsv(row.case_ids);
  const caseNumbers = splitCsv(row.case_numbers);
  return {
    id: row.id,
    caseId: row.case_id,
    caseNumber: row.case_number ?? caseNumbers[0] ?? undefined,
    caseIds: caseIds.length ? caseIds : [row.case_id].filter(Boolean),
    caseNumbers: caseNumbers.length ? caseNumbers : [row.case_number].filter(Boolean),
    title: row.title ?? 'Gesprächsnotiz',
    noteDate: row.note_date,
    noteType: row.note_type as CaseNoteType,
    participants: row.participants ?? undefined,
    content: row.content,
    nextSteps: row.next_steps ?? undefined,
    containsHealthData: Boolean(row.contains_health_data),
    confidentialLevel: (row.confidential_level ?? 'sensibel') as ConfidentialLevel,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}


function mapDocument(row: any): CaseDocumentRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    caseNumber: row.case_number ?? undefined,
    displayTitle: row.display_title ?? row.filename,
    filename: row.filename,
    mimeType: row.mime_type ?? undefined,
    sizeBytes: row.size_bytes === null || row.size_bytes === undefined ? undefined : Number(row.size_bytes),
    sha256: row.sha256,
    extractedText: row.extracted_text ?? undefined,
    containsHealthData: Boolean(row.contains_health_data),
    createdAt: row.created_at
  };
}

function inferMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.doc': 'application/msword',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml'
  };
  return map[ext] ?? 'application/octet-stream';
}

function stripXml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPdfTextBestEffort(buffer: Buffer): string {
  const raw = buffer.toString('latin1');
  const matches = [...raw.matchAll(/\(([^()]|\\.){3,}\)/g)]
    .map((match) => match[0].slice(1, -1).replace(/\\([\\()])/g, '$1'))
    .filter((text) => /[A-Za-zÄÖÜäöüß0-9]{3}/.test(text));
  const text = matches.join(' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 300_000);
}

function readZipTextEntries(filePath: string, matcher: (entryName: string) => boolean): Promise<string[]> {
  return new Promise((resolve) => {
    const chunks: string[] = [];
    yauzl.open(filePath, { lazyEntries: true }, (openError, zipfile) => {
      if (openError || !zipfile) {
        resolve([]);
        return;
      }
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        if (!matcher(entry.fileName)) {
          zipfile.readEntry();
          return;
        }
        zipfile.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) {
            zipfile.readEntry();
            return;
          }
          const parts: Buffer[] = [];
          stream.on('data', (part) => parts.push(Buffer.from(part)));
          stream.on('end', () => {
            chunks.push(stripXml(Buffer.concat(parts).toString('utf8')));
            zipfile.readEntry();
          });
        });
      });
      zipfile.on('end', () => resolve(chunks.filter(Boolean)));
      zipfile.on('error', () => resolve(chunks.filter(Boolean)));
    });
  });
}

async function extractTextBestEffort(filePath: string, filename: string, buffer: Buffer): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  if (['.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm', '.log'].includes(ext)) {
    return buffer.toString('utf8').slice(0, 300_000);
  }
  if (ext === '.pdf') {
    return extractPdfTextBestEffort(buffer);
  }
  if (ext === '.docx') {
    const entries = await readZipTextEntries(filePath, (entry) =>
      entry === 'word/document.xml' || /^word\/(header|footer)\d+\.xml$/.test(entry)
    );
    return entries.join('\n').slice(0, 300_000);
  }
  if (ext === '.xlsx') {
    const entries = await readZipTextEntries(filePath, (entry) =>
      entry === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(entry)
    );
    return entries.join('\n').slice(0, 300_000);
  }
  return '';
}

function mapSearchResult(row: any): CaseSearchResult {
  return {
    sourceType: row.source_type,
    sourceId: row.source_id,
    caseId: row.case_id,
    caseNumber: row.case_number ?? undefined,
    caseNumbers: splitCsv(row.case_numbers),
    title: row.title,
    excerpt: row.excerpt,
    date: row.date ?? undefined,
    rank: Number(row.rank ?? 0)
  };
}

function escapeFtsQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `"${part.replace(/"/g, '""')}"`)
    .join(' AND ');
}

function likePattern(query: string): string {
  return `%${query.trim().replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

export class CaseService {
  constructor(
    private readonly dbProvider: () => DatabaseAdapter,
    private readonly dataDirProvider: () => string = () => path.join(process.cwd(), 'data')
  ) {}

  private ensureCaseWorkSchemaSafe(db: DatabaseAdapter): void {
    const tryExec = (sql: string) => {
      try {
        db.exec(sql);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/duplicate column name|already exists/i.test(message)) throw error;
      }
    };

    tryExec(`ALTER TABLE case_notes ADD COLUMN title TEXT DEFAULT 'Gesprächsnotiz';`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN display_title TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN extracted_text TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN document_key TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN iv TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN auth_tag TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN size_bytes INTEGER;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN imported_at TEXT;`);

    ensureContactPrivacySchema(db);

    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS case_notes_fts USING fts5(
        id UNINDEXED,
        case_id UNINDEXED,
        case_number UNINDEXED,
        title,
        participants,
        content,
        next_steps,
        tokenize = 'unicode61 remove_diacritics 2'
      );

      CREATE TABLE IF NOT EXISTS case_note_cases (
        note_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        is_primary INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        PRIMARY KEY (note_id, case_id),
        FOREIGN KEY (note_id) REFERENCES case_notes(id) ON DELETE CASCADE,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS case_documents_fts USING fts5(
        id UNINDEXED,
        case_id UNINDEXED,
        case_number UNINDEXED,
        title,
        filename,
        extracted_text,
        tokenize = 'unicode61 remove_diacritics 2'
      );

      CREATE INDEX IF NOT EXISTS idx_case_note_cases_case_id ON case_note_cases(case_id);
      CREATE INDEX IF NOT EXISTS idx_case_notes_date ON case_notes(case_id, note_date DESC);
    `);

    // Bestehende Einträge nachziehen, falls das Verknüpfungs-/FTS-Modul später eingeführt wurde.
    db.exec(`
      INSERT OR IGNORE INTO case_note_cases (note_id, case_id, is_primary, created_at)
      SELECT n.id, n.case_id, 1, COALESCE(n.created_at, datetime('now'))
      FROM case_notes n;

      INSERT INTO case_notes_fts (id, case_id, case_number, title, participants, content, next_steps)
      SELECT n.id, n.case_id, c.case_number, COALESCE(n.title, 'Gesprächsnotiz'), COALESCE(n.participants, ''), n.content, COALESCE(n.next_steps, '')
      FROM case_notes n
      JOIN cases c ON c.id = n.case_id
      WHERE NOT EXISTS (SELECT 1 FROM case_notes_fts f WHERE f.id = n.id);

      INSERT INTO case_documents_fts (id, case_id, case_number, title, filename, extracted_text)
      SELECT d.id, d.case_id, c.case_number, COALESCE(d.display_title, d.filename), d.filename, COALESCE(d.extracted_text, '')
      FROM case_documents d
      JOIN cases c ON c.id = d.case_id
      WHERE NOT EXISTS (SELECT 1 FROM case_documents_fts f WHERE f.id = d.id);
    `);
  }

  private getSafeDb(): DatabaseAdapter {
    const db = this.dbProvider();
    this.ensureCaseWorkSchemaSafe(db);
    return db;
  }

  private normalizeNoteCaseIds(primaryCaseId: string, caseIds?: string[]): string[] {
    const normalized = [primaryCaseId, ...(caseIds ?? [])]
      .map((id) => id.trim())
      .filter(Boolean);
    return [...new Set(normalized)];
  }

  private validateCaseLinks(db: DatabaseAdapter, caseIds: string[]): void {
    if (!caseIds.length) throw new Error('Bitte mindestens eine Fallakte als Bezug auswählen.');
    const found = db.prepare<any>(`SELECT id FROM cases WHERE id IN (${caseIds.map(() => '?').join(',')})`).all(...caseIds);
    if (found.length !== caseIds.length) throw new Error('Mindestens ein ausgewählter Fall wurde nicht gefunden.');
  }

  private replaceNoteCaseLinks(db: DatabaseAdapter, noteId: string, caseIds: string[], primaryCaseId: string): void {
    const timestamp = nowIso();
    db.prepare('DELETE FROM case_note_cases WHERE note_id = ?').run(noteId);
    const insertLink = db.prepare(`
      INSERT INTO case_note_cases (note_id, case_id, is_primary, created_at)
      VALUES (?, ?, ?, ?)
    `);
    for (const caseId of caseIds) {
      insertLink.run(noteId, caseId, caseId === primaryCaseId ? 1 : 0, timestamp);
    }
  }

  private noteSelectSql(whereClause: string): string {
    return `
      SELECT n.*, c.case_number,
        GROUP_CONCAT(DISTINCT cnc.case_id) AS case_ids,
        GROUP_CONCAT(DISTINCT linked.case_number) AS case_numbers
      FROM case_notes n
      JOIN cases c ON c.id = n.case_id
      LEFT JOIN case_note_cases cnc ON cnc.note_id = n.id
      LEFT JOIN cases linked ON linked.id = cnc.case_id
      ${whereClause}
    `;
  }

  async listCases(): Promise<CaseRecord[]> {
    const rows = this.getSafeDb()
      .prepare<any>('SELECT * FROM cases ORDER BY opened_at DESC, case_number DESC')
      .all();
    return rows.map(mapCase);
  }

  async createCase(input: CreateCaseInput): Promise<CaseRecord> {
    const db = this.getSafeDb();
    const now = nowIso();
    const id = randomUUID();
    const caseNumber = input.caseNumber.trim();
    const displayName = input.displayName.trim();

    if (!caseNumber) throw new Error('Bitte ein Aktenzeichen erfassen.');
    if (!displayName) throw new Error('Bitte Namen oder Pseudonym der Person erfassen.');

    const existing = db.prepare<any>('SELECT id FROM cases WHERE case_number = ?').get(caseNumber);
    if (existing) throw new Error(`Das Aktenzeichen ist bereits vergeben: ${caseNumber}`);

    db.prepare(`
      INSERT INTO cases (
        id, case_number, display_name, category, status, priority,
        opened_at, summary, is_pseudonymized, is_locked, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'offen', ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      caseNumber,
      displayName,
      input.category,
      input.priority ?? 'normal',
      now,
      input.summary ?? null,
      input.isPseudonymized === false ? 0 : 1,
      now,
      now
    );

    const created = db.prepare<any>('SELECT * FROM cases WHERE id = ?').get(id);
    return mapCase(created);
  }

  async listNotes(caseId: string): Promise<CaseNoteRecord[]> {
    const rows = this.getSafeDb().prepare<any>(this.noteSelectSql(`
      WHERE EXISTS (SELECT 1 FROM case_note_cases link WHERE link.note_id = n.id AND link.case_id = ?)
      GROUP BY n.id
      ORDER BY n.note_date DESC, n.created_at DESC
    `)).all(caseId);
    return rows.map(mapNote);
  }

  async createNote(input: CreateCaseNoteInput): Promise<CaseNoteRecord> {
    const db = this.getSafeDb();
    const caseIds = this.normalizeNoteCaseIds(input.caseId, input.caseIds);
    this.validateCaseLinks(db, caseIds);
    if (!input.title.trim()) throw new Error('Bitte einen Titel erfassen.');
    if (!input.content.trim()) throw new Error('Bitte Inhalt für die Gesprächsnotiz erfassen.');

    const id = randomUUID();
    const timestamp = nowIso();
    const noteDate = input.noteDate ? new Date(input.noteDate).toISOString() : timestamp;

    db.prepare(`
      INSERT INTO case_notes (
        id, case_id, title, note_date, note_type, participants, content, next_steps,
        contains_health_data, confidential_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.caseId,
      input.title.trim(),
      noteDate,
      input.noteType,
      input.participants?.trim() || null,
      input.content.trim(),
      input.nextSteps?.trim() || null,
      input.containsHealthData ? 1 : 0,
      input.confidentialLevel ?? 'sensibel',
      timestamp,
      timestamp
    );

    this.replaceNoteCaseLinks(db, id, caseIds, input.caseId);
    scanCaseNoteContactReferences(db, id);
    this.indexNote(db, id);
    const created = db.prepare<any>(this.noteSelectSql('WHERE n.id = ? GROUP BY n.id')).get(id);
    return mapNote(created);
  }

  async updateNote(id: string, input: UpdateCaseNoteInput): Promise<CaseNoteRecord> {
    const db = this.getSafeDb();
    const before = db.prepare<any>('SELECT * FROM case_notes WHERE id = ?').get(id);
    if (!before) throw new Error(`Gesprächsnotiz nicht gefunden: ${id}`);

    const nextTitle = input.title?.trim() || before.title || 'Gesprächsnotiz';
    const nextContent = input.content?.trim() ?? before.content;
    if (!nextTitle) throw new Error('Bitte einen Titel erfassen.');
    if (!nextContent) throw new Error('Bitte Inhalt für die Gesprächsnotiz erfassen.');

    const linkedCaseIds = input.caseIds === undefined ? undefined : this.normalizeNoteCaseIds(before.case_id, input.caseIds);
    if (linkedCaseIds) this.validateCaseLinks(db, linkedCaseIds);

    db.prepare(`
      UPDATE case_notes SET
        title = ?, note_date = ?, note_type = ?, participants = ?, content = ?, next_steps = ?,
        contains_health_data = ?, confidential_level = ?, updated_at = ?
      WHERE id = ?
    `).run(
      nextTitle,
      input.noteDate ? new Date(input.noteDate).toISOString() : before.note_date,
      input.noteType ?? before.note_type,
      input.participants !== undefined ? (input.participants.trim() || null) : before.participants,
      nextContent,
      input.nextSteps !== undefined ? (input.nextSteps.trim() || null) : before.next_steps,
      input.containsHealthData === undefined ? before.contains_health_data : (input.containsHealthData ? 1 : 0),
      input.confidentialLevel ?? before.confidential_level,
      nowIso(),
      id
    );

    if (linkedCaseIds) this.replaceNoteCaseLinks(db, id, linkedCaseIds, before.case_id);
    scanCaseNoteContactReferences(db, id);
    this.indexNote(db, id);
    const updated = db.prepare<any>(this.noteSelectSql('WHERE n.id = ? GROUP BY n.id')).get(id);
    return mapNote(updated);
  }

  async deleteNote(id: string): Promise<{ deleted: boolean }> {
    const db = this.getSafeDb();
    db.prepare('DELETE FROM case_notes_fts WHERE id = ?').run(id);
    db.prepare('DELETE FROM case_note_cases WHERE note_id = ?').run(id);
    const result = db.prepare<any>('DELETE FROM case_notes WHERE id = ?').run(id) as { changes?: number } | undefined;
    return { deleted: Boolean(result?.changes) };
  }

  async searchContent(input: CaseContentSearchInput): Promise<CaseSearchResult[]> {
    const db = this.getSafeDb();
    const query = input.query.trim();
    if (query.length < 2) return [];

    const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
    const ftsQuery = escapeFtsQuery(query);

    try {
      const params = input.caseId ? [ftsQuery, input.caseId, limit] : [ftsQuery, limit];
      const noteSql = input.caseId
        ? `SELECT 'note' AS source_type, f.id AS source_id, f.case_id, f.case_number, (SELECT GROUP_CONCAT(DISTINCT c.case_number) FROM case_note_cases cnc JOIN cases c ON c.id = cnc.case_id WHERE cnc.note_id = f.id) AS case_numbers, f.title, snippet(case_notes_fts, 5, '[', ']', ' … ', 18) AS excerpt, NULL AS date, bm25(case_notes_fts) AS rank FROM case_notes_fts f WHERE case_notes_fts MATCH ? AND EXISTS (SELECT 1 FROM case_note_cases link WHERE link.note_id = f.id AND link.case_id = ?) ORDER BY rank LIMIT ?`
        : `SELECT 'note' AS source_type, f.id AS source_id, f.case_id, f.case_number, (SELECT GROUP_CONCAT(DISTINCT c.case_number) FROM case_note_cases cnc JOIN cases c ON c.id = cnc.case_id WHERE cnc.note_id = f.id) AS case_numbers, f.title, snippet(case_notes_fts, 5, '[', ']', ' … ', 18) AS excerpt, NULL AS date, bm25(case_notes_fts) AS rank FROM case_notes_fts f WHERE case_notes_fts MATCH ? ORDER BY rank LIMIT ?`;
      const docSql = input.caseId
        ? `SELECT 'document' AS source_type, id AS source_id, case_id, case_number, title, snippet(case_documents_fts, 5, '[', ']', ' … ', 18) AS excerpt, NULL AS date, bm25(case_documents_fts) AS rank FROM case_documents_fts WHERE case_documents_fts MATCH ? AND case_id = ? ORDER BY rank LIMIT ?`
        : `SELECT 'document' AS source_type, id AS source_id, case_id, case_number, title, snippet(case_documents_fts, 5, '[', ']', ' … ', 18) AS excerpt, NULL AS date, bm25(case_documents_fts) AS rank FROM case_documents_fts WHERE case_documents_fts MATCH ? ORDER BY rank LIMIT ?`;

      const notes = db.prepare<any>(noteSql).all(...params).map(mapSearchResult);
      const docs = db.prepare<any>(docSql).all(...params).map(mapSearchResult);
      return [...notes, ...docs].sort((a, b) => a.rank - b.rank).slice(0, limit);
    } catch (error) {
      // Fallback für Umgebungen ohne FTS5 oder bei Sonderzeichen in der Suche.
      const pattern = likePattern(query);
      const noteRows = db.prepare<any>(`
        SELECT 'note' AS source_type, n.id AS source_id, n.case_id, c.case_number,
          (SELECT GROUP_CONCAT(DISTINCT lc.case_number) FROM case_note_cases cnc JOIN cases lc ON lc.id = cnc.case_id WHERE cnc.note_id = n.id) AS case_numbers,
          COALESCE(n.title, 'Gesprächsnotiz') AS title,
          substr(COALESCE(n.content, ''), 1, 220) AS excerpt, n.note_date AS date, 100 AS rank
        FROM case_notes n
        JOIN cases c ON c.id = n.case_id
        WHERE (? IS NULL OR EXISTS (SELECT 1 FROM case_note_cases link WHERE link.note_id = n.id AND link.case_id = ?))
          AND (n.title LIKE ? ESCAPE '\\' OR n.content LIKE ? ESCAPE '\\' OR COALESCE(n.participants, '') LIKE ? ESCAPE '\\' OR COALESCE(n.next_steps, '') LIKE ? ESCAPE '\\')
        ORDER BY n.note_date DESC
        LIMIT ?
      `).all(input.caseId ?? null, input.caseId ?? null, pattern, pattern, pattern, pattern, limit).map(mapSearchResult);

      const docRows = db.prepare<any>(`
        SELECT 'document' AS source_type, d.id AS source_id, d.case_id, c.case_number, COALESCE(d.display_title, d.filename) AS title,
          substr(COALESCE(d.extracted_text, d.filename), 1, 220) AS excerpt, d.created_at AS date, 110 AS rank
        FROM case_documents d
        JOIN cases c ON c.id = d.case_id
        WHERE (? IS NULL OR d.case_id = ?)
          AND (d.filename LIKE ? ESCAPE '\\' OR COALESCE(d.display_title, '') LIKE ? ESCAPE '\\' OR COALESCE(d.extracted_text, '') LIKE ? ESCAPE '\\')
        ORDER BY d.created_at DESC
        LIMIT ?
      `).all(input.caseId ?? null, input.caseId ?? null, pattern, pattern, pattern, limit).map(mapSearchResult);
      return [...noteRows, ...docRows].slice(0, limit);
    }
  }


  async listDocuments(caseId: string): Promise<CaseDocumentRecord[]> {
    const rows = this.getSafeDb().prepare<any>(`
      SELECT d.*, c.case_number
      FROM case_documents d
      JOIN cases c ON c.id = d.case_id
      WHERE d.case_id = ?
      ORDER BY d.created_at DESC
    `).all(caseId);
    return rows.map(mapDocument);
  }

  async importDocument(caseId: string, filePath: string, containsHealthData = true): Promise<CaseDocumentRecord> {
    const db = this.getSafeDb();
    const caseRow = db.prepare<any>('SELECT id, case_number FROM cases WHERE id = ?').get(caseId);
    if (!caseRow) throw new Error(`Fall nicht gefunden: ${caseId}`);

    const originalName = path.basename(filePath);
    const buffer = await fs.promises.readFile(filePath);
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const documentKey = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', documentKey, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const id = randomUUID();
    const timestamp = nowIso();
    const storageDir = path.join(this.dataDirProvider(), 'documents', caseId);
    await fs.promises.mkdir(storageDir, { recursive: true });
    const storagePath = path.join(storageDir, `${id}.gsbvdoc`);
    await fs.promises.writeFile(storagePath, encrypted);

    const extractedText = await extractTextBestEffort(filePath, originalName, buffer);
    const mimeType = inferMimeType(originalName);

    db.prepare(`
      INSERT INTO case_documents (
        id, case_id, filename, display_title, mime_type, storage_path, sha256, extracted_text,
        document_key, iv, auth_tag, size_bytes, contains_health_data, created_at, imported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      caseId,
      originalName,
      originalName,
      mimeType,
      storagePath,
      sha256,
      extractedText,
      documentKey.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      buffer.length,
      containsHealthData ? 1 : 0,
      timestamp,
      timestamp
    );

    this.indexDocument(db, id);
    const created = db.prepare<any>(`
      SELECT d.*, c.case_number FROM case_documents d JOIN cases c ON c.id = d.case_id WHERE d.id = ?
    `).get(id);
    return mapDocument(created);
  }

  private async cleanupTemporaryDocumentCopies(): Promise<void> {
    const tmpDir = path.join(this.dataDirProvider(), 'tmp', 'document-preview');
    await fs.promises.mkdir(tmpDir, { recursive: true });
    const entries = await fs.promises.readdir(tmpDir).catch(() => [] as string[]);
    const maxAgeMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (const entry of entries) {
      const filePath = path.join(tmpDir, entry);
      try {
        const stat = await fs.promises.stat(filePath);
        if (now - stat.mtimeMs > maxAgeMs || entry.startsWith('preview-')) {
          await fs.promises.rm(filePath, { force: true });
        }
      } catch {
        // Viewer kann eine Datei noch geöffnet halten oder sie wurde zwischenzeitlich entfernt.
      }
    }
  }

  private decryptDocumentRow(row: any): Buffer {
    if (!row?.storage_path || !row?.document_key || !row?.iv || !row?.auth_tag) {
      throw new Error('Dokument ist unvollständig gespeichert und kann nicht entschlüsselt werden.');
    }
    const encrypted = fs.readFileSync(row.storage_path);
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(row.document_key, 'base64'),
      Buffer.from(row.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(row.auth_tag, 'base64'));
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private safeExportFileName(filename: string): string {
    const base = path.basename(filename || 'dokument.bin').replace(/[^a-zA-Z0-9._ -]/g, '_').trim();
    return base || 'dokument.bin';
  }

  async createTemporaryDocumentCopy(id: string): Promise<{ filePath: string; fileName: string }> {
    const db = this.getSafeDb();
    const row = db.prepare<any>('SELECT * FROM case_documents WHERE id = ?').get(id);
    if (!row) throw new Error(`Dokument nicht gefunden: ${id}`);
    await this.cleanupTemporaryDocumentCopies();
    const plain = this.decryptDocumentRow(row);
    const tmpDir = path.join(this.dataDirProvider(), 'tmp', 'document-preview');
    await fs.promises.mkdir(tmpDir, { recursive: true });
    const safeName = this.safeExportFileName(row.filename ?? row.display_title ?? `${id}.bin`);
    const tempPath = path.join(tmpDir, `preview-${Date.now()}-${safeName}`);
    await fs.promises.writeFile(tempPath, plain, { mode: 0o600 });
    return { filePath: tempPath, fileName: safeName };
  }

  async exportDocument(id: string, targetPath: string): Promise<{ exported: boolean; filePath: string }> {
    const db = this.getSafeDb();
    const row = db.prepare<any>('SELECT * FROM case_documents WHERE id = ?').get(id);
    if (!row) throw new Error(`Dokument nicht gefunden: ${id}`);
    const plain = this.decryptDocumentRow(row);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, plain, { mode: 0o600 });
    return { exported: true, filePath: targetPath };
  }

  async deleteDocument(id: string): Promise<{ deleted: boolean }> {
    const db = this.getSafeDb();
    const row = db.prepare<any>('SELECT storage_path FROM case_documents WHERE id = ?').get(id);
    db.prepare('DELETE FROM case_documents_fts WHERE id = ?').run(id);
    const result = db.prepare<any>('DELETE FROM case_documents WHERE id = ?').run(id) as { changes?: number } | undefined;
    if (row?.storage_path) {
      await fs.promises.rm(row.storage_path, { force: true }).catch(() => undefined);
    }
    return { deleted: Boolean(result?.changes) };
  }

  private indexNote(db: DatabaseAdapter, noteId: string): void {
    const row = db.prepare<any>(`
      SELECT n.*, c.case_number,
        (SELECT GROUP_CONCAT(DISTINCT lc.case_number) FROM case_note_cases cnc JOIN cases lc ON lc.id = cnc.case_id WHERE cnc.note_id = n.id) AS case_numbers
      FROM case_notes n
      JOIN cases c ON c.id = n.case_id
      WHERE n.id = ?
    `).get(noteId);
    if (!row) return;

    db.prepare('DELETE FROM case_notes_fts WHERE id = ?').run(noteId);
    db.prepare(`
      INSERT INTO case_notes_fts (id, case_id, case_number, title, participants, content, next_steps)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.id,
      row.case_id,
      row.case_number,
      `${row.title ?? 'Gesprächsnotiz'} ${row.case_numbers ?? ''}`,
      row.participants ?? '',
      row.content ?? '',
      row.next_steps ?? ''
    );
  }

  private indexDocument(db: DatabaseAdapter, documentId: string): void {
    const row = db.prepare<any>(`
      SELECT d.*, c.case_number
      FROM case_documents d
      JOIN cases c ON c.id = d.case_id
      WHERE d.id = ?
    `).get(documentId);
    if (!row) return;

    db.prepare('DELETE FROM case_documents_fts WHERE id = ?').run(documentId);
    db.prepare(`
      INSERT INTO case_documents_fts (id, case_id, case_number, title, filename, extracted_text)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      row.id,
      row.case_id,
      row.case_number,
      row.display_title ?? row.filename,
      row.filename ?? '',
      row.extracted_text ?? ''
    );
  }
}
