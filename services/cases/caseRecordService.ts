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
import { PersonCaseLinkService } from "../personCaseLinkService.js";
import { DatabaseUnitOfWork } from "../databaseUnitOfWork.js";
import { assertCanCreateRegularCase } from "../personCaseBindingPolicy.js";
import { SearchIndexService } from "../search/searchIndexService.js";
import { extractDocumentTextBestEffort, inferMimeType } from "../documents/documentTextExtractionService.js";
import { DocumentOcrService } from "../documents/documentOcrService.js";
import { CaseSchemaService } from './caseSchemaService.js';
import { mapCase, nowIso } from './caseSupport.js';
import type { DatabaseRow } from './caseSupport.js';

export class CaseRecordService extends CaseSchemaService {
  async listCases(): Promise<CaseRecord[]> {
      const db = this.getSafeDb();
      this.audit(db, {
        action: "read",
        subjectType: "case",
        purpose: "Fallaktenliste anzeigen",
      });
      const rows = db
        .prepare<DatabaseRow>(
          "SELECT * FROM cases ORDER BY opened_at DESC, case_number DESC",
        )
        .all();
      return rows.map(mapCase);
    }

  async bindLegacyCase(input: LegacyCaseBindingInput): Promise<LegacyCaseBindingResult> {
      const db = this.getSafeDb();
      return new PersonCaseBindingService(db).assignLegacyCase(input.caseId, input.protectedPersonId, input.reason);
    }

  createCase(input: CreateCaseInput): CaseRecord {
      const db = this.getSafeDb();
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
        .prepare<DatabaseRow>("SELECT id FROM cases WHERE case_number = ?")
        .get(caseNumber);
      if (existing)
        throw new Error(`Das Aktenzeichen ist bereits vergeben: ${caseNumber}`);

      return new DatabaseUnitOfWork(db).run(() => {
        const now = nowIso();
        const id = randomUUID();
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
        if (input.protectedPersonId) {
          new PersonCaseLinkService(db).linkCase(
            input.protectedPersonId,
            id,
            "Bei der Fallanlage verknüpft.",
          );
        }
        const created = db.prepare<DatabaseRow>("SELECT * FROM cases WHERE id = ?").get(id);
        this.audit(db, {
          action: "create",
          subjectType: "case",
          subjectId: id,
          caseId: id,
          purpose: "Fallakte angelegt",
          metadata: { category: input.category, bindingState },
        });
        return mapCase(created);
      });
    }
}
