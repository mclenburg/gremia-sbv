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
import { CaseNoteService } from './caseNoteService.js';
import { mapDocument, nowIso } from './caseSupport.js';
import type { DatabaseRow } from './caseSupport.js';

export class CaseDocumentService extends CaseNoteService {
  async listDocuments(caseId: string, measureId?: string): Promise<CaseDocumentRecord[]> {
      const db = this.getSafeDb();
      this.audit(db, {
        action: "read",
        subjectType: "case_document",
        caseId,
        purpose: "Falldokumente anzeigen",
      });
      const rows = db
        .prepare<DatabaseRow>(
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
        .prepare<DatabaseRow>("SELECT id, case_number FROM cases WHERE id = ?")
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
        .prepare<DatabaseRow>(
          `
        SELECT d.*, c.case_number, m.title AS measure_title, m.type AS measure_type
        FROM case_documents d
        JOIN cases c ON c.id = d.case_id
        LEFT JOIN case_measures m ON m.id = d.measure_id
        WHERE d.id = ?
      `,
        )
        .get(id);
      this.audit(db, {
        action: "import",
        subjectType: "case_document",
        subjectId: id,
        caseId,
        purpose: "Falldokument importiert",
      });
      return mapDocument(created);
    }

  protected scheduleDocumentOcrIfUseful(db: DatabaseAdapter, documentId: string): void {
      const ocr = new DocumentOcrService(db);
      if (!ocr.enqueueIfUseful(documentId)) return;
      setTimeout(() => {
        void new DocumentOcrService(db).runPending().catch(() => undefined);
      }, 0);
    }

  protected tempFiles(): TempFileService {
      return new TempFileService(this.dataDirProvider());
    }

  protected async cleanupTemporaryDocumentCopies(): Promise<void> {
      this.tempFiles().cleanup();
    }

  protected decryptDocumentRow(row: DatabaseRow): Buffer {
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

  protected safeExportFileName(filename: string): string {
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
        .prepare<DatabaseRow>("SELECT * FROM case_documents WHERE id = ?")
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
        .prepare<DatabaseRow>("SELECT * FROM case_documents WHERE id = ?")
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
        .prepare<DatabaseRow>(
          "SELECT storage_path, case_id FROM case_documents WHERE id = ?",
        )
        .get(id);
      db.prepare("DELETE FROM case_documents_fts WHERE id = ?").run(id);
      new SearchIndexService(db).deleteSource("document", id);
      new SearchIndexService(db).deleteSource("document_ocr", id);
      const result = db
        .prepare<DatabaseRow>("DELETE FROM case_documents WHERE id = ?")
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

  protected indexDocument(db: DatabaseAdapter, documentId: string): void {
      const row = db
        .prepare<DatabaseRow>(
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
