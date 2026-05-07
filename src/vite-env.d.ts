/// <reference types="vite/client" />

import type { CaseDocumentRecord } from "./app/core/models/case-document.model";
import type { CaseRecord, CreateCaseInput } from "./app/core/models/case.model";
import type {
  ContactListFilters,
  ContactRecord,
  CreateContactInput,
  DeleteContactResult,
  UpdateContactInput,
} from "./app/core/models/contact.model";
import type {
  CaseMeasureRecord,
  CreateCaseMeasureInput,
  UpdateCaseMeasureInput,
} from "./app/core/models/case-measure.model";
import type {
  CaseContentSearchInput,
  CaseNoteRecord,
  CaseSearchResult,
  CreateCaseNoteInput,
  UpdateCaseNoteInput,
} from "./app/core/models/case-note.model";
import type {
  CreateDeadlineInput,
  DeadlineDashboardItem,
  DeadlineListFilters,
  DeadlineRecord,
  UpdateDeadlineInput,
} from "./app/core/models/deadline.model";
import type {
  SecurityResult,
  SecurityStatus,
} from "./app/core/models/security.model";
import type {
  GenerateReportInput,
  ReportDescriptor,
  ReportExportHistoryItem,
  ReportGenerationResult,
} from "./app/core/models/report.model";
import type {
  BackupInspectionResult,
  BackupOperationResult,
} from "./app/core/models/backup.model";
import type {
  RetentionDashboard,
  RetentionOperationResult,
  RetentionSettings,
  UpdateRetentionSettingsInput,
} from "./app/core/models/retention.model";
import type {
  CreatePreventionProcessInput,
  PreventionDashboardSummary,
  PreventionProcessRecord,
  PreventionStepDefinition,
  PreventionWarning,
  UpdatePreventionProcessInput,
} from "./app/core/models/prevention.model";
import type {
  CreateParticipationInput,
  ParticipationDashboardSummary,
  ParticipationRecord,
  ParticipationWarning,
  UpdateParticipationInput,
} from "./app/core/models/participation.model";
import type {
  CreateWorkplaceAccommodationInput,
  UpdateWorkplaceAccommodationInput,
  WorkplaceAccommodationDashboardSummary,
  WorkplaceAccommodationRecord,
  WorkplaceAccommodationWarning,
} from "./app/core/models/workplace-accommodation.model";
import type {
  BemDashboardSummary,
  BemProcessRecord,
  BemStepDefinition,
  BemWarning,
  CreateBemProcessInput,
  UpdateBemProcessInput,
} from "./app/core/models/bem.model";
import type {
  CreateEqualizationProcessInput,
  EqualizationProcessRecord,
  EqualizationWarning,
  UpdateEqualizationProcessInput,
} from "./app/core/models/equalization.model";
import type {
  CreateTerminationHearingInput,
  TerminationHearingRecord,
  TerminationHearingWarning,
  UpdateTerminationHearingInput,
} from "./app/core/models/termination.model";
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
  UpdateLegalNormInput,
} from "./app/core/models/knowledge.model";
import type {
  CreateTemplateInput,
  RenderContextTemplateInput,
  RenderTemplateInput,
  RenderedTemplateResult,
  TemplateListFilters,
  TemplateRecord,
  UpdateTemplateInput,
} from "./app/core/models/template.model";

declare global {
  interface Window {
    gremiaSbv: {
      security: {
        status(): Promise<SecurityStatus>;
        setupInitialPassword(password: string): Promise<SecurityResult>;
        unlock(password: string): Promise<SecurityResult>;
        changePassword(
          currentPassword: string,
          newPassword: string,
        ): Promise<SecurityResult>;
        resetPasswordWithRecoveryKey(
          recoveryKey: string,
          newPassword: string,
        ): Promise<SecurityResult>;
        destroyLocalVault(confirmation: string): Promise<SecurityResult>;
        lock(reason?: "manual" | "auto"): Promise<{ locked: boolean }>;
        cleanupTemporaryFiles(): Promise<{
          deleted: number;
          failed: number;
          remaining: number;
          bytesRemaining: number;
        }>;
        temporaryFileStatus(): Promise<{
          root: string;
          remaining: number;
          bytesRemaining: number;
          oldestRemainingAt?: string;
        }>;
      };
      diagnostics?: {
        bridgeReady: boolean;
        preloadLoadedAt: string;
      };
      cases: {
        list(): Promise<CaseRecord[]>;
        create(input: CreateCaseInput): Promise<CaseRecord>;
        listNotes(caseId: string): Promise<CaseNoteRecord[]>;
        createNote(input: CreateCaseNoteInput): Promise<CaseNoteRecord>;
        updateNote(
          id: string,
          input: UpdateCaseNoteInput,
        ): Promise<CaseNoteRecord>;
        deleteNote(id: string): Promise<{ deleted: boolean }>;
        listDocuments(caseId: string, measureId?: string): Promise<CaseDocumentRecord[]>;
        selectAndImportDocuments(
          caseId: string,
          containsHealthData?: boolean,
          measureId?: string,
        ): Promise<CaseDocumentRecord[]>;
        deleteDocument(id: string): Promise<{ deleted: boolean }>;
        openDocument(
          id: string,
        ): Promise<{ opened: boolean; filePath: string }>;
        exportDocument(
          id: string,
          suggestedFileName?: string,
        ): Promise<{ exported: boolean; filePath: string }>;
        search(input: CaseContentSearchInput): Promise<CaseSearchResult[]>;
      };

      caseMeasures: {
        list(caseId?: string): Promise<CaseMeasureRecord[]>;
        create(input: CreateCaseMeasureInput): Promise<CaseMeasureRecord>;
        update(
          id: string,
          input: UpdateCaseMeasureInput,
        ): Promise<CaseMeasureRecord>;
      };
      contacts: {
        list(filters?: ContactListFilters): Promise<ContactRecord[]>;
        create(input: CreateContactInput): Promise<ContactRecord>;
        update(id: string, input: UpdateContactInput): Promise<ContactRecord>;
        delete(id: string): Promise<DeleteContactResult>;
      };
      knowledge: {
        listNorms(filters?: LegalNormSearchInput): Promise<LegalNormRecord[]>;
        getNorm(id: string): Promise<LegalNormRecord | null>;
        createNorm(input: CreateLegalNormInput): Promise<LegalNormRecord>;
        updateNorm(
          id: string,
          input: UpdateLegalNormInput,
        ): Promise<LegalNormRecord>;
        linkNormToCase(
          input: LinkLegalNormToCaseInput,
        ): Promise<CaseLegalReferenceRecord>;
        listCaseReferences(caseId: string): Promise<CaseLegalReferenceRecord[]>;
        unlinkNormFromCase(
          caseId: string,
          legalNormId: string,
        ): Promise<{ deleted: boolean }>;
        listComments(legalNormId: string): Promise<NormCommentRecord[]>;
        createComment(
          input: CreateNormCommentInput,
        ): Promise<NormCommentRecord>;
        listCaseLaw(legalNormId: string): Promise<CaseLawRecord[]>;
        createCaseLaw(input: CreateCaseLawInput): Promise<CaseLawRecord>;
        listChecklist(legalNormId: string): Promise<NormChecklistItemRecord[]>;
        createChecklistItem(
          input: CreateNormChecklistItemInput,
        ): Promise<NormChecklistItemRecord>;
        exportPreview(): Promise<KnowledgeExportPreview>;
      };
      prevention: {
        steps(): Promise<PreventionStepDefinition[]>;
        list(caseId?: string): Promise<PreventionProcessRecord[]>;
        dashboard(): Promise<PreventionDashboardSummary>;
        create(
          input: CreatePreventionProcessInput,
        ): Promise<PreventionProcessRecord>;
        update(
          id: string,
          input: UpdatePreventionProcessInput,
        ): Promise<PreventionProcessRecord>;
        warnings(id: string): Promise<PreventionWarning[]>;
      };
      participation: {
        list(caseId?: string): Promise<ParticipationRecord[]>;
        dashboard(): Promise<ParticipationDashboardSummary>;
        create(input: CreateParticipationInput): Promise<ParticipationRecord>;
        update(
          id: string,
          input: UpdateParticipationInput,
        ): Promise<ParticipationRecord>;
        warnings(id: string): Promise<ParticipationWarning[]>;
      };

      workplaceAccommodation: {
        list(caseId?: string): Promise<WorkplaceAccommodationRecord[]>;
        dashboard(): Promise<WorkplaceAccommodationDashboardSummary>;
        create(input: CreateWorkplaceAccommodationInput): Promise<WorkplaceAccommodationRecord>;
        update(
          id: string,
          input: UpdateWorkplaceAccommodationInput,
        ): Promise<WorkplaceAccommodationRecord>;
        warnings(id: string): Promise<WorkplaceAccommodationWarning[]>;
      };
      bem: {
        steps(): Promise<BemStepDefinition[]>;
        list(caseId?: string): Promise<BemProcessRecord[]>;
        dashboard(): Promise<BemDashboardSummary>;
        create(input: CreateBemProcessInput): Promise<BemProcessRecord>;
        update(
          id: string,
          input: UpdateBemProcessInput,
        ): Promise<BemProcessRecord>;
        warnings(id: string): Promise<BemWarning[]>;
      };
      equalization: {
        steps(): Promise<string[]>;
        list(caseId?: string): Promise<EqualizationProcessRecord[]>;
        create(
          input: CreateEqualizationProcessInput,
        ): Promise<EqualizationProcessRecord>;
        update(
          id: string,
          input: UpdateEqualizationProcessInput,
        ): Promise<EqualizationProcessRecord>;
        warnings(id: string): Promise<EqualizationWarning[]>;
      };
      termination: {
        steps(): Promise<string[]>;
        list(caseId?: string): Promise<TerminationHearingRecord[]>;
        create(
          input: CreateTerminationHearingInput,
        ): Promise<TerminationHearingRecord>;
        update(
          id: string,
          input: UpdateTerminationHearingInput,
        ): Promise<TerminationHearingRecord>;
        warnings(id: string): Promise<TerminationHearingWarning[]>;
      };
      deadlines: {
        list(filters?: DeadlineListFilters): Promise<DeadlineRecord[]>;
        dashboard(): Promise<DeadlineDashboardItem[]>;
        create(input: CreateDeadlineInput): Promise<DeadlineRecord>;
        update(id: string, input: UpdateDeadlineInput): Promise<DeadlineRecord>;
        complete(id: string, note?: string): Promise<DeadlineRecord>;
        suspend(id: string, reason: string): Promise<DeadlineRecord>;
        cancel(id: string, reason: string): Promise<DeadlineRecord>;
      };
      reports: {
        descriptors(): Promise<ReportDescriptor[]>;
        history(limit?: number): Promise<ReportExportHistoryItem[]>;
        generate(input: GenerateReportInput): Promise<ReportGenerationResult>;
        openExportFolder(filePath?: string): Promise<{ opened: boolean }>;
      };
      templates: {
        list(filters?: TemplateListFilters): Promise<TemplateRecord[]>;
        create(input: CreateTemplateInput): Promise<TemplateRecord>;
        update(id: string, input: UpdateTemplateInput): Promise<TemplateRecord>;
        delete(id: string): Promise<{ deleted: boolean }>;
        render(input: RenderTemplateInput): Promise<RenderedTemplateResult>;
        renderContext(
          input: RenderContextTemplateInput,
        ): Promise<RenderedTemplateResult>;
      };

      retention: {
        dashboard(): Promise<RetentionDashboard>;
        getSettings(): Promise<RetentionSettings>;
        updateSettings(
          input: UpdateRetentionSettingsInput,
        ): Promise<RetentionSettings>;
        anonymizeCase(
          caseId: string,
          reason: string,
          confirmation: string,
        ): Promise<RetentionOperationResult>;
        deleteCase(
          caseId: string,
          reason: string,
          confirmation: string,
        ): Promise<RetentionOperationResult>;
      };
      backup: {
        create(passphrase: string): Promise<BackupOperationResult>;
        inspect(passphrase: string): Promise<BackupInspectionResult>;
        restore(
          passphrase: string,
          confirmation: string,
        ): Promise<BackupOperationResult>;
        openBackupFolder(): Promise<{ opened: boolean }>;
      };
    };
    gremiaSbvPreload?: {
      ready: boolean;
      loadedAt: string;
    };
  }
}
