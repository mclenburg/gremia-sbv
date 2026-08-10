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

export /** SQLite row at the persistence boundary. Values remain scalar and must be
 * normalized by the service mapper before entering the domain model. */
type DatabaseScalar = string;

export type DatabaseRow = Record<string, DatabaseScalar> & {
  handover_status: CaseRecord['handoverStatus'];
  person_binding_state: CaseRecord['personBindingState'];
  privacy_risk: 'normal' | 'low' | 'high' | 'critical';
  privacy_review_priority: NonNullable<CaseRecord['privacyReviewPriority']>;
  extraction_quality: NonNullable<CaseDocumentRecord['extractionQuality']>;
  text_extraction_status: NonNullable<CaseDocumentRecord['textExtractionStatus']>;
  target_type: CaseNoteLinkRecord['targetType'];
  extraction_method: 'manual' | 'unknown' | 'structured' | 'native_text' | 'ocr';
  extraction_status: 'unknown' | 'extracted' | 'empty' | 'unsupported' | 'failed';
  ocr_status: CaseDocumentRecord['ocrStatus'];
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function effectiveHandoverStatus(row: DatabaseRow): CaseRecord['handoverStatus'] {
  const status = row.handover_status ?? 'none';
  if (status === 'active' && row.handover_valid_until) {
    const validUntil = new Date(row.handover_valid_until);
    if (Number.isFinite(validUntil.getTime()) && validUntil.getTime() < Date.now()) return 'expired';
  }
  return status;
}

export function mapCase(row: DatabaseRow | undefined): CaseRecord {
  if (!row) throw new Error('Fall wurde nicht gefunden.');
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
    handoverImportId: row.handover_import_id ?? undefined,
    handoverPackageId: row.handover_package_id ?? undefined,
    handoverValidUntil: row.handover_valid_until ?? undefined,
    handoverStatus: effectiveHandoverStatus(row),
    handoverContinueConfirmedAt: row.handover_continue_confirmed_at ?? undefined,
    handoverContinueReason: row.handover_continue_reason ?? undefined,
  };
}

export function splitCsv(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function mapNote(row: DatabaseRow | undefined): CaseNoteRecord {
  if (!row) throw new Error('Fallnotiz wurde nicht gefunden.');
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

export function mapNoteLink(row: DatabaseRow): CaseNoteLinkRecord {
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

export function mapDocument(row: DatabaseRow | undefined): CaseDocumentRecord {
  if (!row) throw new Error('Dokument wurde nicht gefunden.');
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
