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

export class CaseServiceCore {
  constructor(
      protected readonly dbProvider: () => DatabaseAdapter,
      protected readonly dataDirProvider: () => string = () =>
        path.join(process.cwd(), "data"),
    ) {}

  protected audit(
      db: DatabaseAdapter,
      input: Parameters<PersonalDataAuditLogService["append"]>[0],
    ): void {
      try {
        new PersonalDataAuditLogService(db).append(input);
      } catch (error) {
        console.warn("Gremia.SBV audit log write failed", error);
      }
    }

  protected getSafeDb(): DatabaseAdapter { return this.dbProvider(); }
}
