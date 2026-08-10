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
} from "../../src/app/core/models/case.model.js";
import type { CaseDocumentRecord } from "../../src/app/core/models/case-document.model.js";
import type {
  CaseContentSearchInput,
  CaseNoteRecord,
  CaseNoteType,
  CaseSearchResult,
  ConfidentialLevel,
  CreateCaseNoteInput,
  UpdateCaseNoteInput,
} from "../../src/app/core/models/case-note.model.js";
import type {
  CaseNoteLinkRecord,
  CreateCaseNoteLinkInput,
} from "../../src/app/core/models/case-note-link.model.js";
import type { DatabaseAdapter } from "../databaseService.js";
import {
  ensureContactPrivacySchema,
  scanCaseNoteContactReferences,
} from "../contactPrivacyService.js";
import { PersonalDataAuditLogService } from "../auditLogService.js";
import { TempFileService } from "../tempFileService.js";
import { PersonCaseBindingService } from "../personCaseBindingService.js";
import { assertCanCreateRegularCase } from "../personCaseBindingPolicy.js";
import { SearchIndexService } from "../search/searchIndexService.js";
import { extractDocumentTextBestEffort, inferMimeType } from "../documents/documentTextExtractionService.js";
import { DocumentOcrService } from "../documents/documentOcrService.js";
import { CaseServiceCore } from './caseServiceCore.js';

export class CaseSchemaService extends CaseServiceCore {
  ensureSchema(db = this.dbProvider()): void {
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
}
