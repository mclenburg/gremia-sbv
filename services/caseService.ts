import fs from "node:fs";
import path from "node:path";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import type {
  CaseCategory,
  CasePriority,
  CaseRecord,
  CaseStatus,
  CreateCaseInput,
  LegacyCaseBindingInput,
  LegacyCaseBindingResult,
} from "../src/app/core/models/case.model.js";
import type { CaseDocumentRecord } from "../src/app/core/models/case-document.model.js";
import type {
  CaseContentSearchInput,
  CaseNoteRecord,
  CaseNoteType,
  CaseSearchResult,
  ConfidentialLevel,
  CreateCaseNoteInput,
  UpdateCaseNoteInput,
} from "../src/app/core/models/case-note.model.js";
import type {
  CaseNoteLinkRecord,
  CreateCaseNoteLinkInput,
} from "../src/app/core/models/case-note-link.model.js";
import type { DatabaseAdapter } from "./databaseService.js";
import {
  ensureContactPrivacySchema,
  scanCaseNoteContactReferences,
} from "./contactPrivacyService.js";
import { PersonalDataAuditLogService } from "./auditLogService.js";
import { TempFileService } from "./tempFileService.js";
import { PersonCaseBindingService } from "./personCaseBindingService.js";
import { assertCanCreateRegularCase } from "./personCaseBindingPolicy.js";
import { SearchIndexService } from "./search/searchIndexService.js";
import { extractDocumentTextBestEffort, inferMimeType } from "./documents/documentTextExtractionService.js";
import { DocumentOcrService } from "./documents/documentOcrService.js";

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
    isLocked: Boolean(row.is_locked),
    protectedPersonId: row.protected_person_id ?? undefined,
    personBindingState: row.person_binding_state ?? 'legacy_unlinked',
    privacyReviewRequired: Boolean(row.privacy_review_required),
    privacyReviewReason: row.privacy_review_reason ?? undefined,
    privacyReviewDueAt: row.privacy_review_due_at ?? undefined,
    privacyReviewPriority: row.privacy_review_priority ?? undefined,
    anonymizationRecommended: Boolean(row.anonymization_recommended),
    anonymizedAt: row.anonymized_at ?? undefined,
  };
}

function splitCsv(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function mapNote(row: any): CaseNoteRecord {
  const caseIds = splitCsv(row.case_ids);
  const caseNumbers = splitCsv(row.case_numbers);
  return {
    id: row.id,
    caseId: row.case_id,
    caseNumber: row.case_number ?? caseNumbers[0] ?? undefined,
    caseIds: caseIds.length ? caseIds : [row.case_id].filter(Boolean),
    caseNumbers: caseNumbers.length
      ? caseNumbers
      : [row.case_number].filter(Boolean),
    title: row.title ?? "Gesprächsnotiz",
    noteDate: row.note_date,
    noteType: row.note_type as CaseNoteType,
    participants: row.participants ?? undefined,
    content: row.content,
    nextSteps: row.next_steps ?? undefined,
    containsHealthData: Boolean(row.contains_health_data),
    confidentialLevel: (row.confidential_level ??
      "sensibel") as ConfidentialLevel,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


function mapNoteLink(row: any): CaseNoteLinkRecord {
  return {
    id: row.id,
    caseNoteId: row.case_note_id,
    targetType: row.target_type,
    targetId: row.target_id,
    caseId: row.case_id,
    label: row.label,
    accessibleLabel: row.accessible_label,
    textStart: Number(row.text_start ?? 0),
    textEnd: Number(row.text_end ?? 0),
    createdAt: row.created_at,
    isMissingTarget: Boolean(row.is_missing_target),
  };
}

function mapDocument(row: any): CaseDocumentRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    caseNumber: row.case_number ?? undefined,
    measureId: row.measure_id ?? undefined,
    measureTitle: row.measure_title ?? undefined,
    measureType: row.measure_type ?? undefined,
    displayTitle: row.display_title ?? row.filename,
    filename: row.filename,
    mimeType: row.mime_type ?? undefined,
    sizeBytes:
      row.size_bytes === null || row.size_bytes === undefined
        ? undefined
        : Number(row.size_bytes),
    sha256: row.sha256,
    extractedText: row.extracted_text ?? undefined,
    extractionQuality: row.extraction_quality ?? undefined,
    textExtractionStatus: row.text_extraction_status ?? undefined,
    textExtractedAt: row.text_extracted_at ?? undefined,
    textExtractorId: row.text_extractor_id ?? undefined,
    textExtractionError: row.text_extraction_error ?? undefined,
    ocrStatus: row.ocr_status ?? undefined,
    ocrText: row.ocr_text ?? undefined,
    ocrEngine: row.ocr_engine ?? undefined,
    ocrStartedAt: row.ocr_started_at ?? undefined,
    ocrCompletedAt: row.ocr_completed_at ?? undefined,
    ocrError: row.ocr_error ?? undefined,
    containsHealthData: Boolean(row.contains_health_data),
    createdAt: row.created_at,
  };
}

export class CaseService {
  constructor(
    private readonly dbProvider: () => DatabaseAdapter,
    private readonly dataDirProvider: () => string = () =>
      path.join(process.cwd(), "data"),
  ) {}

  private audit(
    db: DatabaseAdapter,
    input: Parameters<PersonalDataAuditLogService["append"]>[0],
  ): void {
    try {
      new PersonalDataAuditLogService(db).append(input);
    } catch (error) {
      console.warn("Gremia.SBV audit log write failed", error);
    }
  }

  private ensureCaseWorkSchemaSafe(db: DatabaseAdapter): void {
    const tryExec = (sql: string) => {
      try {
        db.exec(sql);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/duplicate column name|already exists/i.test(message)) throw error;
      }
    };

    tryExec(
      `ALTER TABLE case_notes ADD COLUMN title TEXT DEFAULT 'Gesprächsnotiz';`,
    );
    tryExec(`ALTER TABLE case_documents ADD COLUMN display_title TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN extracted_text TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN document_key TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN iv TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN auth_tag TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN size_bytes INTEGER;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN imported_at TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN extraction_quality TEXT DEFAULT 'unknown';`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN text_extraction_status TEXT DEFAULT 'unknown';`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN text_extracted_at TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN text_extractor_id TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN text_extraction_error TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN ocr_status TEXT NOT NULL DEFAULT 'not_required';`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN ocr_text TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN ocr_engine TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN ocr_started_at TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN ocr_completed_at TEXT;`);
    tryExec(`ALTER TABLE case_documents ADD COLUMN ocr_error TEXT;`);
    tryExec(`CREATE INDEX IF NOT EXISTS idx_case_documents_ocr_status ON case_documents(ocr_status, imported_at);`);
    new DocumentOcrService(db).ensureSchema();

    ensureContactPrivacySchema(db);
    new PersonCaseBindingService(db).ensureSchema();

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


      CREATE TABLE IF NOT EXISTS case_note_links (
        id TEXT PRIMARY KEY,
        case_note_id TEXT NOT NULL,
        target_type TEXT NOT NULL CHECK (target_type IN ('bem', 'participation', 'deadline')),
        target_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        label TEXT NOT NULL,
        accessible_label TEXT NOT NULL,
        text_start INTEGER NOT NULL DEFAULT 0,
        text_end INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (case_note_id) REFERENCES case_notes(id) ON DELETE CASCADE,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_case_note_links_note ON case_note_links(case_note_id);
      CREATE INDEX IF NOT EXISTS idx_case_note_links_target ON case_note_links(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_case_note_links_case ON case_note_links(case_id);

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

    new SearchIndexService(db).ensureSchema();
  }

  private getSafeDb(): DatabaseAdapter {
    const db = this.dbProvider();
    this.ensureCaseWorkSchemaSafe(db);
    return db;
  }

  private normalizeNoteCaseIds(
    primaryCaseId: string,
    caseIds?: string[],
  ): string[] {
    const normalized = [primaryCaseId, ...(caseIds ?? [])]
      .map((id) => id.trim())
      .filter(Boolean);
    return [...new Set(normalized)];
  }

  private validateCaseLinks(db: DatabaseAdapter, caseIds: string[]): void {
    if (!caseIds.length)
      throw new Error("Bitte mindestens eine Fallakte als Bezug auswählen.");
    const found = db
      .prepare<any>(
        `SELECT id FROM cases WHERE id IN (${caseIds.map(() => "?").join(",")})`,
      )
      .all(...caseIds);
    if (found.length !== caseIds.length)
      throw new Error("Mindestens ein ausgewählter Fall wurde nicht gefunden.");
  }

  private replaceNoteCaseLinks(
    db: DatabaseAdapter,
    noteId: string,
    caseIds: string[],
    primaryCaseId: string,
  ): void {
    const timestamp = nowIso();
    db.prepare("DELETE FROM case_note_cases WHERE note_id = ?").run(noteId);
    const insertLink = db.prepare(`
      INSERT INTO case_note_cases (note_id, case_id, is_primary, created_at)
      VALUES (?, ?, ?, ?)
    `);
    for (const caseId of caseIds) {
      insertLink.run(
        noteId,
        caseId,
        caseId === primaryCaseId ? 1 : 0,
        timestamp,
      );
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


  private listNoteLinks(db: DatabaseAdapter, noteId: string): CaseNoteLinkRecord[] {
    const rows = db.prepare<any>(`
      SELECT l.*,
        CASE
          WHEN l.target_type = 'bem' AND NOT EXISTS (SELECT 1 FROM bem_processes b WHERE b.id = l.target_id) THEN 1
          WHEN l.target_type = 'prevention' AND NOT EXISTS (SELECT 1 FROM prevention_processes p WHERE p.id = l.target_id) THEN 1
          WHEN l.target_type = 'participation' AND NOT EXISTS (SELECT 1 FROM case_measures m WHERE m.id = l.target_id) THEN 1
          WHEN l.target_type = 'termination_hearing' AND NOT EXISTS (SELECT 1 FROM termination_hearings t WHERE t.id = l.target_id) THEN 1
          WHEN l.target_type = 'equalization' AND NOT EXISTS (SELECT 1 FROM equalization_processes e WHERE e.id = l.target_id) THEN 1
          WHEN l.target_type = 'workplace_accommodation' AND NOT EXISTS (SELECT 1 FROM case_measures a WHERE a.id = l.target_id) THEN 1
          WHEN l.target_type = 'deadline' AND NOT EXISTS (SELECT 1 FROM deadlines d WHERE d.id = l.target_id) THEN 1
          ELSE 0
        END AS is_missing_target
      FROM case_note_links l
      WHERE l.case_note_id = ?
      ORDER BY l.text_start ASC, l.created_at ASC
    `).all(noteId);
    return rows.map(mapNoteLink);
  }

  private attachNoteLinks(db: DatabaseAdapter, note: CaseNoteRecord): CaseNoteRecord {
    return { ...note, links: this.listNoteLinks(db, note.id) };
  }

  private replaceNoteEntityLinks(
    db: DatabaseAdapter,
    noteId: string,
    links: CreateCaseNoteLinkInput[] | undefined,
  ): void {
    if (!links) return;
    const timestamp = nowIso();
    db.prepare('DELETE FROM case_note_links WHERE case_note_id = ?').run(noteId);
    const insert = db.prepare(`
      INSERT INTO case_note_links (
        id, case_note_id, target_type, target_id, case_id, label, accessible_label,
        text_start, text_end, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const link of links) {
      const label = link.label.trim();
      if (!label) continue;
      insert.run(
        randomUUID(),
        noteId,
        link.targetType,
        link.targetId,
        link.caseId,
        label,
        link.accessibleLabel?.trim() || `${label} öffnen`,
        Math.max(0, Math.trunc(link.textStart)),
        Math.max(0, Math.trunc(link.textEnd)),
        timestamp,
      );
      this.audit(db, {
        action: 'create',
        subjectType: 'case_note_link',
        subjectId: link.targetId,
        caseId: link.caseId,
        purpose: 'Interner Fallnotiz-Bezug angelegt',
        metadata: {
          noteId,
          targetType: link.targetType,
          targetId: link.targetId,
        },
      });
    }
  }

  async listCases(): Promise<CaseRecord[]> {
    const db = this.getSafeDb();
    this.audit(db, {
      action: "read",
      subjectType: "case",
      purpose: "Fallaktenliste anzeigen",
    });
    const rows = db
      .prepare<any>(
        "SELECT * FROM cases ORDER BY opened_at DESC, case_number DESC",
      )
      .all();
    return rows.map(mapCase);
  }

  async bindLegacyCase(input: LegacyCaseBindingInput): Promise<LegacyCaseBindingResult> {
    const db = this.getSafeDb();
    return new PersonCaseBindingService(db).assignLegacyCase(input.caseId, input.protectedPersonId, input.reason);
  }

  async createCase(input: CreateCaseInput): Promise<CaseRecord> {
    const db = this.getSafeDb();
    const now = nowIso();
    const id = randomUUID();
    const caseNumber = input.caseNumber.trim();
    const displayName = input.displayName.trim();

    if (!caseNumber) throw new Error("Bitte ein Aktenzeichen erfassen.");
    if (!displayName)
      throw new Error("Bitte Namen oder Pseudonym der Person erfassen.");

    const bindingState = input.personBindingState ?? "active";
    assertCanCreateRegularCase({
      protectedPersonId: input.protectedPersonId,
      personBindingState: bindingState,
      isAnonymousRequest: bindingState === "anonymous_request",
    });

    const existing = db
      .prepare<any>("SELECT id FROM cases WHERE case_number = ?")
      .get(caseNumber);
    if (existing)
      throw new Error(`Das Aktenzeichen ist bereits vergeben: ${caseNumber}`);

    db.prepare(
      `
      INSERT INTO cases (
        id, case_number, display_name, category, status, priority,
        opened_at, summary, is_pseudonymized, is_locked, protected_person_id, person_binding_state, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'offen', ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `,
    ).run(
      id,
      caseNumber,
      displayName,
      input.category,
      input.priority ?? "normal",
      now,
      input.summary ?? null,
      input.isPseudonymized === false ? 0 : 1,
      input.protectedPersonId ?? null,
      bindingState,
      now,
      now,
    );

    const created = db.prepare<any>("SELECT * FROM cases WHERE id = ?").get(id);
    this.audit(db, {
      action: "create",
      subjectType: "case",
      subjectId: id,
      caseId: id,
      purpose: "Fallakte angelegt",
      metadata: { category: input.category, bindingState },
    });
    return mapCase(created);
  }

  async listNotes(caseId: string): Promise<CaseNoteRecord[]> {
    const db = this.getSafeDb();
    this.audit(db, {
      action: "read",
      subjectType: "case_note",
      caseId,
      purpose: "Fallnotizen anzeigen",
    });
    const rows = db
      .prepare<any>(
        this.noteSelectSql(`
      WHERE EXISTS (SELECT 1 FROM case_note_cases link WHERE link.note_id = n.id AND link.case_id = ?)
      GROUP BY n.id
      ORDER BY n.note_date DESC, n.created_at DESC
    `),
      )
      .all(caseId);
    return rows.map(mapNote).map((note) => this.attachNoteLinks(db, note));
  }

  async createNote(input: CreateCaseNoteInput): Promise<CaseNoteRecord> {
    const db = this.getSafeDb();
    const caseIds = this.normalizeNoteCaseIds(input.caseId, input.caseIds);
    this.validateCaseLinks(db, caseIds);
    if (!input.title.trim()) throw new Error("Bitte einen Titel erfassen.");
    if (!input.content.trim())
      throw new Error("Bitte Inhalt für die Gesprächsnotiz erfassen.");

    const id = randomUUID();
    const timestamp = nowIso();
    const noteDate = input.noteDate
      ? new Date(input.noteDate).toISOString()
      : timestamp;

    db.prepare(
      `
      INSERT INTO case_notes (
        id, case_id, title, note_date, note_type, participants, content, next_steps,
        contains_health_data, confidential_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      input.caseId,
      input.title.trim(),
      noteDate,
      input.noteType,
      input.participants?.trim() || null,
      input.content.trim(),
      input.nextSteps?.trim() || null,
      input.containsHealthData ? 1 : 0,
      input.confidentialLevel ?? "sensibel",
      timestamp,
      timestamp,
    );

    this.replaceNoteCaseLinks(db, id, caseIds, input.caseId);
    this.replaceNoteEntityLinks(db, id, input.links);
    scanCaseNoteContactReferences(db, id);
    this.indexNote(db, id);
    new SearchIndexService(db).reindexSource("note", id);
    const created = db
      .prepare<any>(this.noteSelectSql("WHERE n.id = ? GROUP BY n.id"))
      .get(id);
    this.audit(db, {
      action: "create",
      subjectType: "case_note",
      subjectId: id,
      caseId: input.caseId,
      purpose: "Fallnotiz angelegt",
      metadata: {
        containsHealthData: input.containsHealthData,
        confidentialLevel: input.confidentialLevel ?? "sensibel",
      },
    });
    return this.attachNoteLinks(db, mapNote(created));
  }

  async updateNote(
    id: string,
    input: UpdateCaseNoteInput,
  ): Promise<CaseNoteRecord> {
    const db = this.getSafeDb();
    const before = db
      .prepare<any>("SELECT * FROM case_notes WHERE id = ?")
      .get(id);
    if (!before) throw new Error(`Gesprächsnotiz nicht gefunden: ${id}`);

    const nextTitle = input.title?.trim() || before.title || "Gesprächsnotiz";
    const nextContent = input.content?.trim() ?? before.content;
    if (!nextTitle) throw new Error("Bitte einen Titel erfassen.");
    if (!nextContent)
      throw new Error("Bitte Inhalt für die Gesprächsnotiz erfassen.");

    const linkedCaseIds =
      input.caseIds === undefined
        ? undefined
        : this.normalizeNoteCaseIds(before.case_id, input.caseIds);
    if (linkedCaseIds) this.validateCaseLinks(db, linkedCaseIds);

    db.prepare(
      `
      UPDATE case_notes SET
        title = ?, note_date = ?, note_type = ?, participants = ?, content = ?, next_steps = ?,
        contains_health_data = ?, confidential_level = ?, updated_at = ?
      WHERE id = ?
    `,
    ).run(
      nextTitle,
      input.noteDate
        ? new Date(input.noteDate).toISOString()
        : before.note_date,
      input.noteType ?? before.note_type,
      input.participants !== undefined
        ? input.participants.trim() || null
        : before.participants,
      nextContent,
      input.nextSteps !== undefined
        ? input.nextSteps.trim() || null
        : before.next_steps,
      input.containsHealthData === undefined
        ? before.contains_health_data
        : input.containsHealthData
          ? 1
          : 0,
      input.confidentialLevel ?? before.confidential_level,
      nowIso(),
      id,
    );

    if (linkedCaseIds)
      this.replaceNoteCaseLinks(db, id, linkedCaseIds, before.case_id);
    this.replaceNoteEntityLinks(db, id, input.links);
    scanCaseNoteContactReferences(db, id);
    this.indexNote(db, id);
    new SearchIndexService(db).reindexSource("note", id);
    const updated = db
      .prepare<any>(this.noteSelectSql("WHERE n.id = ? GROUP BY n.id"))
      .get(id);
    this.audit(db, {
      action: "update",
      subjectType: "case_note",
      subjectId: id,
      caseId: before.case_id,
      purpose: "Fallnotiz geändert",
    });
    return this.attachNoteLinks(db, mapNote(updated));
  }

  async deleteNote(id: string): Promise<{ deleted: boolean }> {
    const db = this.getSafeDb();
    new SearchIndexService(db).deleteSource("note", id);
    db.prepare("DELETE FROM case_notes_fts WHERE id = ?").run(id);
    db.prepare("DELETE FROM case_note_cases WHERE note_id = ?").run(id);
    db.prepare("DELETE FROM case_note_links WHERE case_note_id = ?").run(id);
    const before = db
      .prepare<any>("SELECT case_id FROM case_notes WHERE id = ?")
      .get(id);
    const result = db
      .prepare<any>("DELETE FROM case_notes WHERE id = ?")
      .run(id) as { changes?: number } | undefined;
    this.audit(db, {
      action: "delete",
      subjectType: "case_note",
      subjectId: id,
      caseId: before?.case_id,
      purpose: "Fallnotiz gelöscht",
    });
    return { deleted: Boolean(result?.changes) };
  }

  async searchContent(
    input: CaseContentSearchInput,
  ): Promise<CaseSearchResult[]> {
    const db = this.getSafeDb();
    this.audit(db, {
      action: "search",
      subjectType: "case_content",
      caseId: input.caseId,
      purpose: "Volltextsuche in personenbezogenen Falldaten",
      metadata: { hasCaseFilter: Boolean(input.caseId) },
    });
    return new SearchIndexService(db).search(input);
  }

  async listDocuments(caseId: string, measureId?: string): Promise<CaseDocumentRecord[]> {
    const db = this.getSafeDb();
    this.audit(db, {
      action: "read",
      subjectType: "case_document",
      caseId,
      purpose: "Falldokumente anzeigen",
    });
    const rows = db
      .prepare<any>(
        `
      SELECT d.*, c.case_number, m.title AS measure_title, m.type AS measure_type
      FROM case_documents d
      JOIN cases c ON c.id = d.case_id
      LEFT JOIN case_measures m ON m.id = d.measure_id
      WHERE d.case_id = ? AND (? IS NULL OR d.measure_id = ?)
      ORDER BY d.created_at DESC
    `,
      )
      .all(caseId, measureId ?? null, measureId ?? null);
    return rows.map(mapDocument);
  }

  async importDocument(
    caseId: string,
    filePath: string,
    containsHealthData = true,
    measureId?: string,
  ): Promise<CaseDocumentRecord> {
    const db = this.getSafeDb();
    const caseRow = db
      .prepare<any>("SELECT id, case_number FROM cases WHERE id = ?")
      .get(caseId);
    if (!caseRow) throw new Error(`Fall nicht gefunden: ${caseId}`);

    const originalName = path.basename(filePath);
    const buffer = await fs.promises.readFile(filePath);
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const documentKey = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", documentKey, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const id = randomUUID();
    const timestamp = nowIso();
    const storageDir = path.join(this.dataDirProvider(), "documents", caseId);
    await fs.promises.mkdir(storageDir, { recursive: true });
    const storagePath = path.join(storageDir, `${id}.gsbvdoc`);
    await fs.promises.writeFile(storagePath, encrypted);

    const extraction = await extractDocumentTextBestEffort(
      filePath,
      originalName,
      buffer,
    );
    const extractedText = extraction.text;
    const mimeType = extraction.mimeType;

    db.prepare(
      `
      INSERT INTO case_documents (
        id, case_id, measure_id, filename, display_title, mime_type, storage_path, sha256, extracted_text,
        document_key, iv, auth_tag, size_bytes, contains_health_data, extraction_quality, text_extraction_status, text_extracted_at, text_extractor_id, text_extraction_error, ocr_status, created_at, imported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      caseId,
      measureId ?? null,
      originalName,
      originalName,
      mimeType,
      storagePath,
      sha256,
      extractedText,
      documentKey.toString("base64"),
      iv.toString("base64"),
      authTag.toString("base64"),
      buffer.length,
      containsHealthData ? 1 : 0,
      extraction.quality,
      extraction.status,
      timestamp,
      extraction.extractorId,
      extraction.errorMessage ?? null,
      'not_required',
      timestamp,
      timestamp,
    );

    this.indexDocument(db, id);
    new SearchIndexService(db).reindexSource("document", id);
    this.scheduleDocumentOcrIfUseful(db, id);
    const created = db
      .prepare<any>(
        `
      SELECT d.*, c.case_number, m.title AS measure_title, m.type AS measure_type
      FROM case_documents d
      JOIN cases c ON c.id = d.case_id
      LEFT JOIN case_measures m ON m.id = d.measure_id
      WHERE d.id = ?
    `,
      )
      .get(id);
    return mapDocument(created);
  }


  private scheduleDocumentOcrIfUseful(db: DatabaseAdapter, documentId: string): void {
    const ocr = new DocumentOcrService(db);
    if (!ocr.enqueueIfUseful(documentId)) return;
    setTimeout(() => {
      void new DocumentOcrService(db).runPending().catch(() => undefined);
    }, 0);
  }

  private tempFiles(): TempFileService {
    return new TempFileService(this.dataDirProvider());
  }

  private async cleanupTemporaryDocumentCopies(): Promise<void> {
    this.tempFiles().cleanup();
  }

  private decryptDocumentRow(row: any): Buffer {
    if (
      !row?.storage_path ||
      !row?.document_key ||
      !row?.iv ||
      !row?.auth_tag
    ) {
      throw new Error(
        "Dokument ist unvollständig gespeichert und kann nicht entschlüsselt werden.",
      );
    }
    const encrypted = fs.readFileSync(row.storage_path);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(row.document_key, "base64"),
      Buffer.from(row.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(row.auth_tag, "base64"));
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private safeExportFileName(filename: string): string {
    const base = path
      .basename(filename || "dokument.bin")
      .replace(/[^a-zA-Z0-9._ -]/g, "_")
      .trim();
    return base || "dokument.bin";
  }

  async createTemporaryDocumentCopy(
    id: string,
  ): Promise<{ filePath: string; fileName: string }> {
    const db = this.getSafeDb();
    const row = db
      .prepare<any>("SELECT * FROM case_documents WHERE id = ?")
      .get(id);
    if (!row) throw new Error(`Dokument nicht gefunden: ${id}`);
    await this.cleanupTemporaryDocumentCopies();
    const plain = this.decryptDocumentRow(row);
    const safeName = this.safeExportFileName(
      row.filename ?? row.display_title ?? `${id}.bin`,
    );
    const tempPath = this.tempFiles().write(
      "document-preview",
      safeName,
      plain,
      "preview",
    );
    this.audit(db, {
      action: "open",
      subjectType: "case_document",
      subjectId: id,
      caseId: row.case_id,
      purpose: "Falldokument zur Vorschau entschlüsselt",
    });
    return { filePath: tempPath, fileName: safeName };
  }

  async exportDocument(
    id: string,
    targetPath: string,
  ): Promise<{ exported: boolean; filePath: string }> {
    const db = this.getSafeDb();
    const row = db
      .prepare<any>("SELECT * FROM case_documents WHERE id = ?")
      .get(id);
    if (!row) throw new Error(`Dokument nicht gefunden: ${id}`);
    const plain = this.decryptDocumentRow(row);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, plain, { mode: 0o600 });
    this.audit(db, {
      action: "export",
      subjectType: "case_document",
      subjectId: id,
      caseId: row.case_id,
      purpose: "Falldokument exportiert",
    });
    return { exported: true, filePath: targetPath };
  }

  async deleteDocument(id: string): Promise<{ deleted: boolean }> {
    const db = this.getSafeDb();
    const row = db
      .prepare<any>(
        "SELECT storage_path, case_id FROM case_documents WHERE id = ?",
      )
      .get(id);
    db.prepare("DELETE FROM case_documents_fts WHERE id = ?").run(id);
    new SearchIndexService(db).deleteSource("document", id);
    new SearchIndexService(db).deleteSource("document_ocr", id);
    const result = db
      .prepare<any>("DELETE FROM case_documents WHERE id = ?")
      .run(id) as { changes?: number } | undefined;
    if (row?.storage_path) {
      await fs.promises
        .rm(row.storage_path, { force: true })
        .catch(() => undefined);
    }
    this.audit(db, {
      action: "delete",
      subjectType: "case_document",
      subjectId: id,
      caseId: row?.case_id,
      purpose: "Falldokument gelöscht",
    });
    return { deleted: Boolean(result?.changes) };
  }

  private indexNote(db: DatabaseAdapter, noteId: string): void {
    const row = db
      .prepare<any>(
        `
      SELECT n.*, c.case_number,
        (SELECT GROUP_CONCAT(DISTINCT lc.case_number) FROM case_note_cases cnc JOIN cases lc ON lc.id = cnc.case_id WHERE cnc.note_id = n.id) AS case_numbers
      FROM case_notes n
      JOIN cases c ON c.id = n.case_id
      WHERE n.id = ?
    `,
      )
      .get(noteId);
    if (!row) return;

    db.prepare("DELETE FROM case_notes_fts WHERE id = ?").run(noteId);
    db.prepare(
      `
      INSERT INTO case_notes_fts (id, case_id, case_number, title, participants, content, next_steps)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      row.id,
      row.case_id,
      row.case_number,
      `${row.title ?? "Gesprächsnotiz"} ${row.case_numbers ?? ""}`,
      row.participants ?? "",
      row.content ?? "",
      row.next_steps ?? "",
    );
  }

  private indexDocument(db: DatabaseAdapter, documentId: string): void {
    const row = db
      .prepare<any>(
        `
      SELECT d.*, c.case_number
      FROM case_documents d
      JOIN cases c ON c.id = d.case_id
      WHERE d.id = ?
    `,
      )
      .get(documentId);
    if (!row) return;

    db.prepare("DELETE FROM case_documents_fts WHERE id = ?").run(documentId);
    db.prepare(
      `
      INSERT INTO case_documents_fts (id, case_id, case_number, title, filename, extracted_text)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      row.id,
      row.case_id,
      row.case_number,
      row.display_title ?? row.filename,
      row.filename ?? "",
      row.extracted_text ?? "",
    );
  }
}
