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
} from "../../src/domain/models/case.model.js";
import type { CaseDocumentRecord } from "../../src/domain/models/case-document.model.js";
import type {
  CaseContentSearchInput,
  CaseNoteRecord,
  CaseNoteType,
  CaseSearchResult,
  ConfidentialLevel,
  CreateCaseNoteInput,
  UpdateCaseNoteInput,
} from "../../src/domain/models/case-note.model.js";
import type {
  CaseNoteLinkRecord,
  CreateCaseNoteLinkInput,
} from "../../src/domain/models/case-note-link.model.js";
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
import { DatabaseUnitOfWork } from "../databaseUnitOfWork.js";
import { materializeCaseNoteInlineActions } from "./caseNoteInlineActionMaterializer.js";
import { CaseRecordService } from './caseRecordService.js';
import { mapNote, mapNoteLink, nowIso } from './caseSupport.js';
import type { DatabaseRow } from './caseSupport.js';

export class CaseNoteService extends CaseRecordService {
  protected normalizeNoteCaseIds(
      primaryCaseId: string,
      caseIds?: string[],
    ): string[] {
      const normalized = [primaryCaseId, ...(caseIds ?? [])]
        .map((id) => id.trim())
        .filter(Boolean);
      return [...new Set(normalized)];
    }

  protected validateCaseLinks(db: DatabaseAdapter, caseIds: string[]): void {
      if (!caseIds.length)
        throw new Error("Bitte mindestens eine Fallakte als Bezug auswählen.");
      const found = db
        .prepare<DatabaseRow>(
          `SELECT id FROM cases WHERE id IN (${caseIds.map(() => "?").join(",")})`,
        )
        .all(...caseIds);
      if (found.length !== caseIds.length)
        throw new Error("Mindestens ein ausgewählter Fall wurde nicht gefunden.");
    }

  protected replaceNoteCaseLinks(
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

  protected noteSelectSql(whereClause: string): string {
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

  protected listNoteLinks(db: DatabaseAdapter, noteId: string): CaseNoteLinkRecord[] {
      const rows = db.prepare<DatabaseRow>(`
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

  protected attachNoteLinks(db: DatabaseAdapter, note: CaseNoteRecord): CaseNoteRecord {
      return { ...note, links: this.listNoteLinks(db, note.id) };
    }

  protected replaceNoteEntityLinks(
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


  async listNotes(caseId: string): Promise<CaseNoteRecord[]> {
      const db = this.getSafeDb();
      this.audit(db, {
        action: "read",
        subjectType: "case_note",
        caseId,
        purpose: "Fallnotizen anzeigen",
      });
      const rows = db
        .prepare<DatabaseRow>(
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
      return new DatabaseUnitOfWork(db).run(() => {
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
      const inlineLinks = materializeCaseNoteInlineActions(db, input.inlineActions, input.caseId);
      this.replaceNoteEntityLinks(db, id, [...(input.links ?? []), ...inlineLinks]);
      scanCaseNoteContactReferences(db, id);
      this.indexNote(db, id);
      new SearchIndexService(db).reindexSource("note", id);
      const created = db
        .prepare<DatabaseRow>(this.noteSelectSql("WHERE n.id = ? GROUP BY n.id"))
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
      });
  }

  async updateNote(
      id: string,
      input: UpdateCaseNoteInput,
    ): Promise<CaseNoteRecord> {
      const db = this.getSafeDb();
      return new DatabaseUnitOfWork(db).run(() => {

      const before = db
        .prepare<DatabaseRow>("SELECT * FROM case_notes WHERE id = ?")
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
      const inlineLinks = materializeCaseNoteInlineActions(db, input.inlineActions, before.case_id);
      const existingLinks = input.links === undefined && inlineLinks.length
        ? this.listNoteLinks(db, id).map((link): CreateCaseNoteLinkInput => ({
            targetType: link.targetType,
            targetId: link.targetId,
            caseId: link.caseId,
            label: link.label,
            accessibleLabel: link.accessibleLabel,
            textStart: link.textStart,
            textEnd: link.textEnd,
          }))
        : input.links;
      this.replaceNoteEntityLinks(db, id, existingLinks === undefined && !inlineLinks.length ? undefined : [...(existingLinks ?? []), ...inlineLinks]);
      scanCaseNoteContactReferences(db, id);
      this.indexNote(db, id);
      new SearchIndexService(db).reindexSource("note", id);
      const updated = db
        .prepare<DatabaseRow>(this.noteSelectSql("WHERE n.id = ? GROUP BY n.id"))
        .get(id);
      this.audit(db, {
        action: "update",
        subjectType: "case_note",
        subjectId: id,
        caseId: before.case_id,
        purpose: "Fallnotiz geändert",
      });
      return this.attachNoteLinks(db, mapNote(updated));
      });
  }

  async deleteNote(id: string): Promise<{ deleted: boolean }> {
      const db = this.getSafeDb();
      new SearchIndexService(db).deleteSource("note", id);
      db.prepare("DELETE FROM case_notes_fts WHERE id = ?").run(id);
      db.prepare("DELETE FROM case_note_cases WHERE note_id = ?").run(id);
      db.prepare("DELETE FROM case_note_links WHERE case_note_id = ?").run(id);
      const before = db
        .prepare<DatabaseRow>("SELECT case_id FROM case_notes WHERE id = ?")
        .get(id);
      const result = db
        .prepare<DatabaseRow>("DELETE FROM case_notes WHERE id = ?")
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

  protected indexNote(db: DatabaseAdapter, noteId: string): void {
      const row = db
        .prepare<DatabaseRow>(
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
}
