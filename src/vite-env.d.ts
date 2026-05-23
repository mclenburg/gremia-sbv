/// <reference types="vite/client" />
import type { ComplianceAuditChainStatus, ComplianceDatabaseIntegrityStatus, DataSubjectAccessPrefill, DataSubjectAccessRequestInput } from "./app/core/models/compliance.model";

import type { CaseDocumentRecord } from "./app/core/models/case-document.model";
import type { CaseHandoverContinueExpiredResult, CaseHandoverExportInput, CaseHandoverExportResult, CaseHandoverImportInput, CaseHandoverImportResult, CaseHandoverInspectResult } from "./app/core/models/case-handover.model";
import type { CaseRecord, CreateCaseInput, LegacyCaseBindingInput, LegacyCaseBindingResult } from "./app/core/models/case.model";
import type {
  ContactListFilters,
  ContactRecord,
  CreateContactInput,
  DeleteContactResult,
  UpdateContactInput,
} from "./app/core/models/contact.model";
import type {
  CaseMeasureNoteProcessType,
  CaseMeasureNoteRecord,
  CaseMeasureRecord,
  CreateCaseMeasureInput,
  CreateCaseMeasureNoteInput,
  UpdateCaseMeasureInput,
  UpdateCaseMeasureNoteInput,
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
import type { PrivacyReviewActionInput, PrivacyReviewActionResult, PrivacyReviewBulkResult, PrivacyReviewItemRecord } from "./app/core/models/privacy-review.model";
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
import type { TemplateDefaultValues } from "./app/core/models/template-default.model";
import type { CreateGremiaBrExternalReferenceInput, GremiaBrCachedOverview, GremiaBrCacheRefreshResult, GremiaBrConnectionTestResult, GremiaBrDashboardOverview, GremiaBrExternalReferenceRecord, GremiaBrInlineSuggestion, GremiaBrPublicSettings, GremiaBrRelevanceSettings, GremiaBrSettingsInput } from "./app/core/models/gremia-br.model";

import type {
  CreateTemplateInput,
  RenderContextTemplateInput,
  RenderTemplateInput,
  RenderedTemplateResult,
  TemplateListFilters,
  TemplateRecord,
  UpdateTemplateInput,
} from "./app/core/models/template.model";
import type { CreateSbvResourceRecordInput, SbvResourceDashboardSummary, SbvResourceRecord, UpdateSbvResourceRecordInput } from "./app/core/models/sbv-resource.model";

import type {
  CreateProtectedPersonInput,
  PersonAnonymizationResult,
  PersonCaseLinkRecord,
  PersonImportExecuteInput,
  PersonImportExecuteResult,
  PersonImportPreviewInput,
  PersonImportPreviewResult,
  PersonStatusExpirySummary,
  ProtectedPersonListFilters,
  ProtectedPersonRecord,
  UpdateProtectedPersonInput,
} from "./app/core/models/protected-person.model";

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
        bindLegacyCase(input: LegacyCaseBindingInput): Promise<LegacyCaseBindingResult>;
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

      caseHandover: {
      export: (input: CaseHandoverExportInput, suggestedFileName?: string) => Promise<CaseHandoverExportResult>;
      selectFile: () => Promise<{ canceled: true } | { canceled: false; filePath: string; fileName: string }>;
      inspect: (filePath: string, passphrase: string) => Promise<CaseHandoverInspectResult>;
      selectAndInspect: (passphrase: string) => Promise<{ canceled: true } | { canceled: false; filePath: string; fileName: string; inspection: CaseHandoverInspectResult }>;
      import: (input: CaseHandoverImportInput) => Promise<CaseHandoverImportResult>;
      continueExpired: (caseId: string, reason: string) => Promise<CaseHandoverContinueExpiredResult>;
    };

    caseMeasures: {
        list(caseId?: string): Promise<CaseMeasureRecord[]>;
        create(input: CreateCaseMeasureInput): Promise<CaseMeasureRecord>;
        update(
          id: string,
          input: UpdateCaseMeasureInput,
        ): Promise<CaseMeasureRecord>;
        listNotes(
          caseId: string,
          measureType?: CaseMeasureNoteProcessType,
          measureId?: string,
        ): Promise<CaseMeasureNoteRecord[]>;
        createNote(input: CreateCaseMeasureNoteInput): Promise<CaseMeasureNoteRecord>;
        updateNote(
          id: string,
          input: UpdateCaseMeasureNoteInput,
        ): Promise<CaseMeasureNoteRecord>;
        deleteNote(id: string): Promise<{ deleted: boolean }>;
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

      sbvResources: {
        list(): Promise<SbvResourceRecord[]>;
        dashboard(): Promise<SbvResourceDashboardSummary>;
        create(input: CreateSbvResourceRecordInput): Promise<SbvResourceRecord>;
        update(id: string, input: UpdateSbvResourceRecordInput): Promise<SbvResourceRecord>;
        delete(id: string): Promise<{ deleted: boolean }>;
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

      compliance: {
        auditChainStatus(): Promise<ComplianceAuditChainStatus>;
        databaseIntegrityStatus(): Promise<ComplianceDatabaseIntegrityStatus>;
        prefillDsar(input: DataSubjectAccessRequestInput): Promise<DataSubjectAccessPrefill>;
      };

      persons: {
        list(filters?: ProtectedPersonListFilters): Promise<ProtectedPersonRecord[]>;
        create(input: CreateProtectedPersonInput): Promise<ProtectedPersonRecord>;
        createAnonymousRequest(label?: string): Promise<ProtectedPersonRecord>;
        update(id: string, input: UpdateProtectedPersonInput): Promise<ProtectedPersonRecord>;
        linkCase(personId: string, caseId: string, reason?: string): Promise<PersonCaseLinkRecord>;
        previewImport(input: PersonImportPreviewInput): Promise<PersonImportPreviewResult>;
        executeImport(input: PersonImportExecuteInput): Promise<PersonImportExecuteResult>;
        selectImportFile(): Promise<{ filePath: string; sourceFileName: string; fileType: 'csv' | 'xlsx' } | null>;
        evaluateExpiry(referenceIso?: string): Promise<PersonStatusExpirySummary>;
        anonymize(id: string, reason: string): Promise<PersonAnonymizationResult>;
        delete(id: string, reason: string): Promise<{ ok: true; affectedCaseIds: string[]; deletedPersonId: string }>;
      };

      privacyReview: {
        listOpenForPerson(protectedPersonId: string): Promise<PrivacyReviewItemRecord[]>;
        documentRetention(input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult>;
        scheduleLater(input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult>;
        clearCase(input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult>;
        anonymizeCase(input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult>;
        deleteCase(input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult>;
        bulkMarkClosedLegacy(): Promise<PrivacyReviewBulkResult>;
      };
      deadlines: {
        list(filters?: DeadlineListFilters): Promise<DeadlineRecord[]>;
        dashboard(): Promise<DeadlineDashboardItem[]>;
        create(input: CreateDeadlineInput): Promise<DeadlineRecord>;
        update(id: string, input: UpdateDeadlineInput): Promise<DeadlineRecord>;
        complete(id: string, note?: string): Promise<DeadlineRecord>;
        suspend(id: string, reason: string): Promise<DeadlineRecord>;
        cancel(id: string, reason: string): Promise<DeadlineRecord>;
        exportIcal(filters?: DeadlineListFilters, privacyLevel?: "privacy_first" | "process_type" | "case_reference" | "details"): Promise<string>;
      };

      gremiaBr: {
        getSettings(): Promise<GremiaBrPublicSettings>;
        saveSettings(input: GremiaBrSettingsInput): Promise<GremiaBrPublicSettings>;
        clearCredentials(): Promise<GremiaBrPublicSettings>;
        saveRelevanceSettings(input: GremiaBrRelevanceSettings): Promise<GremiaBrPublicSettings>;
        testConnection(): Promise<GremiaBrConnectionTestResult>;
        getCachedOverview(): Promise<GremiaBrCachedOverview>;
        getDashboardOverview(): Promise<GremiaBrDashboardOverview>;
        refreshCache(): Promise<GremiaBrCacheRefreshResult>;
        suggestInlineReferences(query: string): Promise<GremiaBrInlineSuggestion[]>;
        listExternalReferences(caseId: string): Promise<GremiaBrExternalReferenceRecord[]>;
        saveExternalReference(input: CreateGremiaBrExternalReferenceInput): Promise<GremiaBrExternalReferenceRecord>;
        deleteExternalReference(referenceId: string): Promise<{ deleted: boolean }>;
      };
      templateDefaults: {
        list(): Promise<TemplateDefaultValues>;
        save(values: TemplateDefaultValues): Promise<TemplateDefaultValues>;
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
