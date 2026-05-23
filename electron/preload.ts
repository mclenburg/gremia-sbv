import { contextBridge, ipcRenderer } from "electron";
import type { CaseHandoverContinueExpiredResult, CaseHandoverExportInput, CaseHandoverExportResult, CaseHandoverImportInput, CaseHandoverImportResult, CaseHandoverInspectResult } from "../src/app/core/models/case-handover.model.js";
import type { CaseDocumentRecord } from "../src/app/core/models/case-document.model.js";
import type {
  CaseRecord,
  CreateCaseInput,
  LegacyCaseBindingInput,
  LegacyCaseBindingResult,
} from "../src/app/core/models/case.model.js";
import type {
  CaseMeasureNoteProcessType,
  CaseMeasureNoteRecord,
  CaseMeasureRecord,
  CreateCaseMeasureInput,
  CreateCaseMeasureNoteInput,
  UpdateCaseMeasureInput,
  UpdateCaseMeasureNoteInput,
} from "../src/app/core/models/case-measure.model.js";
import type {
  ContactListFilters,
  ContactRecord,
  CreateContactInput,
  DeleteContactResult,
  UpdateContactInput,
} from "../src/app/core/models/contact.model.js";
import type {
  CaseContentSearchInput,
  CaseNoteRecord,
  CaseSearchResult,
  CreateCaseNoteInput,
  UpdateCaseNoteInput,
} from "../src/app/core/models/case-note.model.js";
import type {
  CreateDeadlineInput,
  DeadlineDashboardItem,
  DeadlineListFilters,
  DeadlineRecord,
  UpdateDeadlineInput,
} from "../src/app/core/models/deadline.model.js";
import type { PrivacyReviewActionInput, PrivacyReviewActionResult, PrivacyReviewBulkResult, PrivacyReviewItemRecord } from "../src/app/core/models/privacy-review.model.js";
import type { ComplianceAuditChainStatus, ComplianceDatabaseIntegrityStatus, DataSubjectAccessPrefill, DataSubjectAccessRequestInput } from "../src/app/core/models/compliance.model.js";
import type {
  SecurityResult,
  SecurityStatus,
} from "../src/app/core/models/security.model.js";
import type {
  GenerateReportInput,
  ReportDescriptor,
  ReportExportHistoryItem,
  ReportGenerationResult,
} from "../src/app/core/models/report.model.js";
import type {
  BackupInspectionResult,
  BackupOperationResult,
} from "../src/app/core/models/backup.model.js";
import type {
  RetentionDashboard,
  RetentionOperationResult,
  RetentionSettings,
  UpdateRetentionSettingsInput,
} from "../src/app/core/models/retention.model.js";
import type {
  CreatePreventionProcessInput,
  PreventionDashboardSummary,
  PreventionProcessRecord,
  PreventionStepDefinition,
  PreventionWarning,
  UpdatePreventionProcessInput,
} from "../src/app/core/models/prevention.model.js";
import type {
  CreateParticipationInput,
  ParticipationDashboardSummary,
  ParticipationRecord,
  ParticipationWarning,
  UpdateParticipationInput,
} from "../src/app/core/models/participation.model.js";
import type {
  CreateWorkplaceAccommodationInput,
  UpdateWorkplaceAccommodationInput,
  WorkplaceAccommodationDashboardSummary,
  WorkplaceAccommodationRecord,
  WorkplaceAccommodationWarning,
} from "../src/app/core/models/workplace-accommodation.model.js";
import type {
  BemDashboardSummary,
  BemProcessRecord,
  BemStepDefinition,
  BemWarning,
  CreateBemProcessInput,
  UpdateBemProcessInput,
} from "../src/app/core/models/bem.model.js";
import type {
  CreateEqualizationProcessInput,
  EqualizationProcessRecord,
  EqualizationWarning,
  UpdateEqualizationProcessInput,
} from "../src/app/core/models/equalization.model.js";
import type {
  CreateTerminationHearingInput,
  TerminationHearingRecord,
  TerminationHearingWarning,
  UpdateTerminationHearingInput,
} from "../src/app/core/models/termination.model.js";
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
} from "../src/app/core/models/knowledge.model.js";
import type { TemplateDefaultValues } from "../src/app/core/models/template-default.model.js";
import type { CreateGremiaBrExternalReferenceInput, GremiaBrCachedOverview, GremiaBrCacheRefreshResult, GremiaBrConnectionTestResult, GremiaBrDashboardOverview, GremiaBrExternalReferenceRecord, GremiaBrInlineSuggestion, GremiaBrPublicSettings, GremiaBrRelevanceSettings, GremiaBrSettingsInput } from "../src/app/core/models/gremia-br.model.js";
import type {
  CreateTemplateInput,
  RenderContextTemplateInput,
  RenderTemplateInput,
  RenderedTemplateResult,
  TemplateListFilters,
  TemplateRecord,
  UpdateTemplateInput,
} from "../src/app/core/models/template.model.js";
import type { CreateSbvResourceRecordInput, SbvResourceDashboardSummary, SbvResourceRecord, UpdateSbvResourceRecordInput } from "../src/app/core/models/sbv-resource.model.js";

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
} from "../src/app/core/models/protected-person.model.js";

const api = {
  security: {
    status: (): Promise<SecurityStatus> =>
      ipcRenderer.invoke("security:status"),
    setupInitialPassword: (password: string): Promise<SecurityResult> =>
      ipcRenderer.invoke("security:setup-initial-password", password),
    unlock: (password: string): Promise<SecurityResult> =>
      ipcRenderer.invoke("security:unlock", password),
    changePassword: (
      currentPassword: string,
      newPassword: string,
    ): Promise<SecurityResult> =>
      ipcRenderer.invoke(
        "security:change-password",
        currentPassword,
        newPassword,
      ),
    resetPasswordWithRecoveryKey: (
      recoveryKey: string,
      newPassword: string,
    ): Promise<SecurityResult> =>
      ipcRenderer.invoke(
        "security:reset-password-with-recovery-key",
        recoveryKey,
        newPassword,
      ),
    destroyLocalVault: (confirmation: string): Promise<SecurityResult> =>
      ipcRenderer.invoke("security:destroy-local-vault", confirmation),
    lock: (reason?: "manual" | "auto"): Promise<{ locked: boolean }> =>
      ipcRenderer.invoke("security:lock", reason),
    cleanupTemporaryFiles: (): Promise<{
      deleted: number;
      failed: number;
      remaining: number;
      bytesRemaining: number;
    }> => ipcRenderer.invoke("security:temp-files:cleanup"),
    temporaryFileStatus: (): Promise<{
      root: string;
      remaining: number;
      bytesRemaining: number;
      oldestRemainingAt?: string;
    }> => ipcRenderer.invoke("security:temp-files:status"),
  },
  cases: {
    list: (): Promise<CaseRecord[]> => ipcRenderer.invoke("cases:list"),
    create: (input: CreateCaseInput): Promise<CaseRecord> =>
      ipcRenderer.invoke("cases:create", input),
    bindLegacyCase: (input: LegacyCaseBindingInput): Promise<LegacyCaseBindingResult> =>
      ipcRenderer.invoke("cases:bind-legacy", input),
    listNotes: (caseId: string): Promise<CaseNoteRecord[]> =>
      ipcRenderer.invoke("cases:notes:list", caseId),
    createNote: (input: CreateCaseNoteInput): Promise<CaseNoteRecord> =>
      ipcRenderer.invoke("cases:notes:create", input),
    updateNote: (
      id: string,
      input: UpdateCaseNoteInput,
    ): Promise<CaseNoteRecord> =>
      ipcRenderer.invoke("cases:notes:update", id, input),
    deleteNote: (id: string): Promise<{ deleted: boolean }> =>
      ipcRenderer.invoke("cases:notes:delete", id),
    listDocuments: (caseId: string, measureId?: string): Promise<CaseDocumentRecord[]> =>
      ipcRenderer.invoke("cases:documents:list", caseId, measureId),
    selectAndImportDocuments: (
      caseId: string,
      containsHealthData = true,
      measureId?: string,
    ): Promise<CaseDocumentRecord[]> =>
      ipcRenderer.invoke(
        "cases:documents:select-and-import",
        caseId,
        containsHealthData,
        measureId,
      ),
    deleteDocument: (id: string): Promise<{ deleted: boolean }> =>
      ipcRenderer.invoke("cases:documents:delete", id),
    openDocument: (
      id: string,
    ): Promise<{ opened: boolean; filePath: string }> =>
      ipcRenderer.invoke("cases:documents:open", id),
    exportDocument: (
      id: string,
      suggestedFileName?: string,
    ): Promise<{ exported: boolean; filePath: string }> =>
      ipcRenderer.invoke("cases:documents:export", id, suggestedFileName),
    search: (input: CaseContentSearchInput): Promise<CaseSearchResult[]> =>
      ipcRenderer.invoke("cases:search", input),
  },

  caseHandover: {
    export: (input: CaseHandoverExportInput, suggestedFileName?: string): Promise<CaseHandoverExportResult> =>
      ipcRenderer.invoke("caseHandover:export", input, suggestedFileName),
    selectFile: (): Promise<{ canceled: true } | { canceled: false; filePath: string; fileName: string }> =>
      ipcRenderer.invoke("caseHandover:select-file"),
    inspect: (filePath: string, passphrase: string): Promise<CaseHandoverInspectResult> =>
      ipcRenderer.invoke("caseHandover:inspect", filePath, passphrase),
    selectAndInspect: (passphrase: string): Promise<{ canceled: true } | { canceled: false; filePath: string; fileName: string; inspection: CaseHandoverInspectResult }> =>
      ipcRenderer.invoke("caseHandover:select-and-inspect", passphrase),
    import: (input: CaseHandoverImportInput): Promise<CaseHandoverImportResult> =>
      ipcRenderer.invoke("caseHandover:import", input),
    continueExpired: (caseId: string, reason: string): Promise<CaseHandoverContinueExpiredResult> =>
      ipcRenderer.invoke("caseHandover:continue-expired", caseId, reason),
  },

  caseMeasures: {
    list: (caseId?: string): Promise<CaseMeasureRecord[]> =>
      ipcRenderer.invoke("caseMeasures:list", caseId),
    create: (input: CreateCaseMeasureInput): Promise<CaseMeasureRecord> =>
      ipcRenderer.invoke("caseMeasures:create", input),
    update: (
      id: string,
      input: UpdateCaseMeasureInput,
    ): Promise<CaseMeasureRecord> =>
      ipcRenderer.invoke("caseMeasures:update", id, input),
    listNotes: (
      caseId: string,
      measureType?: CaseMeasureNoteProcessType,
      measureId?: string,
    ): Promise<CaseMeasureNoteRecord[]> =>
      ipcRenderer.invoke("caseMeasures:notes:list", caseId, measureType, measureId),
    createNote: (input: CreateCaseMeasureNoteInput): Promise<CaseMeasureNoteRecord> =>
      ipcRenderer.invoke("caseMeasures:notes:create", input),
    updateNote: (
      id: string,
      input: UpdateCaseMeasureNoteInput,
    ): Promise<CaseMeasureNoteRecord> =>
      ipcRenderer.invoke("caseMeasures:notes:update", id, input),
    deleteNote: (id: string): Promise<{ deleted: boolean }> =>
      ipcRenderer.invoke("caseMeasures:notes:delete", id),
  },
  contacts: {
    list: (filters?: ContactListFilters): Promise<ContactRecord[]> =>
      ipcRenderer.invoke("contacts:list", filters),
    create: (input: CreateContactInput): Promise<ContactRecord> =>
      ipcRenderer.invoke("contacts:create", input),
    update: (id: string, input: UpdateContactInput): Promise<ContactRecord> =>
      ipcRenderer.invoke("contacts:update", id, input),
    delete: (id: string): Promise<DeleteContactResult> =>
      ipcRenderer.invoke("contacts:delete", id),
  },

  knowledge: {
    listNorms: (filters?: LegalNormSearchInput): Promise<LegalNormRecord[]> =>
      ipcRenderer.invoke("knowledge:norms:list", filters),
    getNorm: (id: string): Promise<LegalNormRecord | null> =>
      ipcRenderer.invoke("knowledge:norms:get", id),
    createNorm: (input: CreateLegalNormInput): Promise<LegalNormRecord> =>
      ipcRenderer.invoke("knowledge:norms:create", input),
    updateNorm: (
      id: string,
      input: UpdateLegalNormInput,
    ): Promise<LegalNormRecord> =>
      ipcRenderer.invoke("knowledge:norms:update", id, input),
    linkNormToCase: (
      input: LinkLegalNormToCaseInput,
    ): Promise<CaseLegalReferenceRecord> =>
      ipcRenderer.invoke("knowledge:cases:link", input),
    listCaseReferences: (caseId: string): Promise<CaseLegalReferenceRecord[]> =>
      ipcRenderer.invoke("knowledge:cases:list", caseId),
    unlinkNormFromCase: (
      caseId: string,
      legalNormId: string,
    ): Promise<{ deleted: boolean }> =>
      ipcRenderer.invoke("knowledge:cases:unlink", caseId, legalNormId),
    listComments: (legalNormId: string): Promise<NormCommentRecord[]> =>
      ipcRenderer.invoke("knowledge:comments:list", legalNormId),
    createComment: (
      input: CreateNormCommentInput,
    ): Promise<NormCommentRecord> =>
      ipcRenderer.invoke("knowledge:comments:create", input),
    listCaseLaw: (legalNormId: string): Promise<CaseLawRecord[]> =>
      ipcRenderer.invoke("knowledge:caselaw:list", legalNormId),
    createCaseLaw: (input: CreateCaseLawInput): Promise<CaseLawRecord> =>
      ipcRenderer.invoke("knowledge:caselaw:create", input),
    listChecklist: (legalNormId: string): Promise<NormChecklistItemRecord[]> =>
      ipcRenderer.invoke("knowledge:checklist:list", legalNormId),
    createChecklistItem: (
      input: CreateNormChecklistItemInput,
    ): Promise<NormChecklistItemRecord> =>
      ipcRenderer.invoke("knowledge:checklist:create", input),
    exportPreview: (): Promise<KnowledgeExportPreview> =>
      ipcRenderer.invoke("knowledge:export:preview"),
  },

  prevention: {
    steps: (): Promise<PreventionStepDefinition[]> =>
      ipcRenderer.invoke("prevention:steps"),
    list: (caseId?: string): Promise<PreventionProcessRecord[]> =>
      ipcRenderer.invoke("prevention:list", caseId),
    dashboard: (): Promise<PreventionDashboardSummary> =>
      ipcRenderer.invoke("prevention:dashboard"),
    create: (
      input: CreatePreventionProcessInput,
    ): Promise<PreventionProcessRecord> =>
      ipcRenderer.invoke("prevention:create", input),
    update: (
      id: string,
      input: UpdatePreventionProcessInput,
    ): Promise<PreventionProcessRecord> =>
      ipcRenderer.invoke("prevention:update", id, input),
    warnings: (id: string): Promise<PreventionWarning[]> =>
      ipcRenderer.invoke("prevention:warnings", id),
  },
  participation: {
    list: (caseId?: string): Promise<ParticipationRecord[]> =>
      ipcRenderer.invoke("participation:list", caseId),
    dashboard: (): Promise<ParticipationDashboardSummary> =>
      ipcRenderer.invoke("participation:dashboard"),
    create: (input: CreateParticipationInput): Promise<ParticipationRecord> =>
      ipcRenderer.invoke("participation:create", input),
    update: (
      id: string,
      input: UpdateParticipationInput,
    ): Promise<ParticipationRecord> =>
      ipcRenderer.invoke("participation:update", id, input),
    warnings: (id: string): Promise<ParticipationWarning[]> =>
      ipcRenderer.invoke("participation:warnings", id),
  },

  sbvResources: {
    list: (): Promise<SbvResourceRecord[]> => ipcRenderer.invoke("sbvResources:list"),
    dashboard: (): Promise<SbvResourceDashboardSummary> => ipcRenderer.invoke("sbvResources:dashboard"),
    create: (input: CreateSbvResourceRecordInput): Promise<SbvResourceRecord> => ipcRenderer.invoke("sbvResources:create", input),
    update: (id: string, input: UpdateSbvResourceRecordInput): Promise<SbvResourceRecord> => ipcRenderer.invoke("sbvResources:update", id, input),
    delete: (id: string): Promise<{ deleted: boolean }> => ipcRenderer.invoke("sbvResources:delete", id),
  },

  workplaceAccommodation: {
    list: (caseId?: string): Promise<WorkplaceAccommodationRecord[]> =>
      ipcRenderer.invoke("workplaceAccommodation:list", caseId),
    dashboard: (): Promise<WorkplaceAccommodationDashboardSummary> =>
      ipcRenderer.invoke("workplaceAccommodation:dashboard"),
    create: (input: CreateWorkplaceAccommodationInput): Promise<WorkplaceAccommodationRecord> =>
      ipcRenderer.invoke("workplaceAccommodation:create", input),
    update: (
      id: string,
      input: UpdateWorkplaceAccommodationInput,
    ): Promise<WorkplaceAccommodationRecord> =>
      ipcRenderer.invoke("workplaceAccommodation:update", id, input),
    warnings: (id: string): Promise<WorkplaceAccommodationWarning[]> =>
      ipcRenderer.invoke("workplaceAccommodation:warnings", id),
  },
  bem: {
    steps: (): Promise<BemStepDefinition[]> => ipcRenderer.invoke("bem:steps"),
    list: (caseId?: string): Promise<BemProcessRecord[]> =>
      ipcRenderer.invoke("bem:list", caseId),
    dashboard: (): Promise<BemDashboardSummary> =>
      ipcRenderer.invoke("bem:dashboard"),
    create: (input: CreateBemProcessInput): Promise<BemProcessRecord> =>
      ipcRenderer.invoke("bem:create", input),
    update: (
      id: string,
      input: UpdateBemProcessInput,
    ): Promise<BemProcessRecord> => ipcRenderer.invoke("bem:update", id, input),
    warnings: (id: string): Promise<BemWarning[]> =>
      ipcRenderer.invoke("bem:warnings", id),
  },
  equalization: {
    steps: (): Promise<string[]> => ipcRenderer.invoke("equalization:steps"),
    list: (caseId?: string): Promise<EqualizationProcessRecord[]> =>
      ipcRenderer.invoke("equalization:list", caseId),
    create: (
      input: CreateEqualizationProcessInput,
    ): Promise<EqualizationProcessRecord> =>
      ipcRenderer.invoke("equalization:create", input),
    update: (
      id: string,
      input: UpdateEqualizationProcessInput,
    ): Promise<EqualizationProcessRecord> =>
      ipcRenderer.invoke("equalization:update", id, input),
    warnings: (id: string): Promise<EqualizationWarning[]> =>
      ipcRenderer.invoke("equalization:warnings", id),
  },
  termination: {
    steps: (): Promise<string[]> => ipcRenderer.invoke("termination:steps"),
    list: (caseId?: string): Promise<TerminationHearingRecord[]> =>
      ipcRenderer.invoke("termination:list", caseId),
    create: (
      input: CreateTerminationHearingInput,
    ): Promise<TerminationHearingRecord> =>
      ipcRenderer.invoke("termination:create", input),
    update: (
      id: string,
      input: UpdateTerminationHearingInput,
    ): Promise<TerminationHearingRecord> =>
      ipcRenderer.invoke("termination:update", id, input),
    warnings: (id: string): Promise<TerminationHearingWarning[]> =>
      ipcRenderer.invoke("termination:warnings", id),
  },

  compliance: {
    auditChainStatus: (): Promise<ComplianceAuditChainStatus> =>
      ipcRenderer.invoke("compliance:audit-chain-status"),
    databaseIntegrityStatus: (): Promise<ComplianceDatabaseIntegrityStatus> =>
      ipcRenderer.invoke("compliance:database-integrity-status"),
    prefillDsar: (input: DataSubjectAccessRequestInput): Promise<DataSubjectAccessPrefill> =>
      ipcRenderer.invoke("compliance:dsar-prefill", input),
  },

  persons: {
    list: (filters?: ProtectedPersonListFilters): Promise<ProtectedPersonRecord[]> =>
      ipcRenderer.invoke("persons:list", filters),
    create: (input: CreateProtectedPersonInput): Promise<ProtectedPersonRecord> =>
      ipcRenderer.invoke("persons:create", input),
    createAnonymousRequest: (label?: string): Promise<ProtectedPersonRecord> =>
      ipcRenderer.invoke("persons:create-anonymous-request", label),
    update: (id: string, input: UpdateProtectedPersonInput): Promise<ProtectedPersonRecord> =>
      ipcRenderer.invoke("persons:update", id, input),
    linkCase: (personId: string, caseId: string, reason?: string): Promise<PersonCaseLinkRecord> =>
      ipcRenderer.invoke("persons:link-case", personId, caseId, reason),
    previewImport: (input: PersonImportPreviewInput): Promise<PersonImportPreviewResult> =>
      ipcRenderer.invoke("persons:import:preview", input),
    executeImport: (input: PersonImportExecuteInput): Promise<PersonImportExecuteResult> =>
      ipcRenderer.invoke("persons:import:execute", input),
    selectImportFile: (): Promise<{ filePath: string; sourceFileName: string; fileType: 'csv' | 'xlsx' } | null> =>
      ipcRenderer.invoke("persons:import:select-preview"),
    evaluateExpiry: (referenceIso?: string): Promise<PersonStatusExpirySummary> =>
      ipcRenderer.invoke("persons:expiry:evaluate", referenceIso),
    anonymize: (id: string, reason: string): Promise<PersonAnonymizationResult> =>
      ipcRenderer.invoke("persons:anonymize", id, reason),
    delete: (id: string, reason: string): Promise<{ ok: true; affectedCaseIds: string[]; deletedPersonId: string }> =>
      ipcRenderer.invoke("persons:delete", id, reason),
  },

  privacyReview: {
    listOpenForPerson: (protectedPersonId: string): Promise<PrivacyReviewItemRecord[]> =>
      ipcRenderer.invoke("privacy-review:list-open-for-person", protectedPersonId),
    documentRetention: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
      ipcRenderer.invoke("privacy-review:document-retention", input),
    scheduleLater: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
      ipcRenderer.invoke("privacy-review:schedule-later", input),
    clearCase: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
      ipcRenderer.invoke("privacy-review:clear-case", input),
    anonymizeCase: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
      ipcRenderer.invoke("privacy-review:anonymize-case", input),
    deleteCase: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
      ipcRenderer.invoke("privacy-review:delete-case", input),
    bulkMarkClosedLegacy: (): Promise<PrivacyReviewBulkResult> =>
      ipcRenderer.invoke("privacy-review:bulk-mark-closed-legacy"),
  },
  deadlines: {
    list: (filters?: DeadlineListFilters): Promise<DeadlineRecord[]> =>
      ipcRenderer.invoke("deadlines:list", filters),
    dashboard: (): Promise<DeadlineDashboardItem[]> =>
      ipcRenderer.invoke("deadlines:dashboard"),
    create: (input: CreateDeadlineInput): Promise<DeadlineRecord> =>
      ipcRenderer.invoke("deadlines:create", input),
    update: (id: string, input: UpdateDeadlineInput): Promise<DeadlineRecord> =>
      ipcRenderer.invoke("deadlines:update", id, input),
    complete: (id: string, note?: string): Promise<DeadlineRecord> =>
      ipcRenderer.invoke("deadlines:complete", id, note),
    suspend: (id: string, reason: string): Promise<DeadlineRecord> =>
      ipcRenderer.invoke("deadlines:suspend", id, reason),
    cancel: (id: string, reason: string): Promise<DeadlineRecord> =>
      ipcRenderer.invoke("deadlines:cancel", id, reason),
    exportIcal: (filters?: DeadlineListFilters, privacyLevel?: "privacy_first" | "process_type" | "case_reference" | "details"): Promise<string> =>
      ipcRenderer.invoke("deadlines:ical-export", filters, privacyLevel),
  },

  gremiaBr: {
    getSettings: (): Promise<GremiaBrPublicSettings> =>
      ipcRenderer.invoke("gremia-br:settings:get"),
    saveSettings: (input: GremiaBrSettingsInput): Promise<GremiaBrPublicSettings> =>
      ipcRenderer.invoke("gremia-br:settings:save", input),
    clearCredentials: (): Promise<GremiaBrPublicSettings> =>
      ipcRenderer.invoke("gremia-br:credentials:clear"),
    saveRelevanceSettings: (input: GremiaBrRelevanceSettings): Promise<GremiaBrPublicSettings> =>
      ipcRenderer.invoke("gremia-br:relevance:save", input),
    testConnection: (): Promise<GremiaBrConnectionTestResult> =>
      ipcRenderer.invoke("gremia-br:connection:test"),
    getCachedOverview: (): Promise<GremiaBrCachedOverview> =>
      ipcRenderer.invoke("gremia-br:cache:get"),
    getDashboardOverview: (): Promise<GremiaBrDashboardOverview> =>
      ipcRenderer.invoke("gremia-br:dashboard:get"),
    refreshCache: (): Promise<GremiaBrCacheRefreshResult> =>
      ipcRenderer.invoke("gremia-br:cache:refresh"),
    suggestInlineReferences: (query: string): Promise<GremiaBrInlineSuggestion[]> =>
      ipcRenderer.invoke("gremia-br:inline:suggest", query),
    listExternalReferences: (caseId: string): Promise<GremiaBrExternalReferenceRecord[]> =>
      ipcRenderer.invoke("gremia-br:references:list", caseId),
    saveExternalReference: (input: CreateGremiaBrExternalReferenceInput): Promise<GremiaBrExternalReferenceRecord> =>
      ipcRenderer.invoke("gremia-br:references:create", input),
    deleteExternalReference: (referenceId: string): Promise<{ deleted: boolean }> =>
      ipcRenderer.invoke("gremia-br:references:delete", referenceId),
  },
  templateDefaults: {
    list: (): Promise<TemplateDefaultValues> =>
      ipcRenderer.invoke("template-defaults:list"),
    save: (values: TemplateDefaultValues): Promise<TemplateDefaultValues> =>
      ipcRenderer.invoke("template-defaults:save", values),
  },
  reports: {
    descriptors: (): Promise<ReportDescriptor[]> =>
      ipcRenderer.invoke("reports:descriptors"),
    history: (limit?: number): Promise<ReportExportHistoryItem[]> =>
      ipcRenderer.invoke("reports:history", limit),
    generate: (input: GenerateReportInput): Promise<ReportGenerationResult> =>
      ipcRenderer.invoke("reports:generate", input),
    openExportFolder: (filePath?: string): Promise<{ opened: boolean }> =>
      ipcRenderer.invoke("reports:open-export-folder", filePath),
  },
  templates: {
    list: (filters?: TemplateListFilters): Promise<TemplateRecord[]> =>
      ipcRenderer.invoke("templates:list", filters),
    create: (input: CreateTemplateInput): Promise<TemplateRecord> =>
      ipcRenderer.invoke("templates:create", input),
    update: (id: string, input: UpdateTemplateInput): Promise<TemplateRecord> =>
      ipcRenderer.invoke("templates:update", id, input),
    delete: (id: string): Promise<{ deleted: boolean }> =>
      ipcRenderer.invoke("templates:delete", id),
    render: (input: RenderTemplateInput): Promise<RenderedTemplateResult> =>
      ipcRenderer.invoke("templates:render", input),
    renderContext: (
      input: RenderContextTemplateInput,
    ): Promise<RenderedTemplateResult> =>
      ipcRenderer.invoke("templates:render-context", input),
  },

  retention: {
    dashboard: (): Promise<RetentionDashboard> =>
      ipcRenderer.invoke("retention:dashboard"),
    getSettings: (): Promise<RetentionSettings> =>
      ipcRenderer.invoke("retention:settings:get"),
    updateSettings: (
      input: UpdateRetentionSettingsInput,
    ): Promise<RetentionSettings> =>
      ipcRenderer.invoke("retention:settings:update", input),
    anonymizeCase: (
      caseId: string,
      reason: string,
      confirmation: string,
    ): Promise<RetentionOperationResult> =>
      ipcRenderer.invoke(
        "retention:case:anonymize",
        caseId,
        reason,
        confirmation,
      ),
    deleteCase: (
      caseId: string,
      reason: string,
      confirmation: string,
    ): Promise<RetentionOperationResult> =>
      ipcRenderer.invoke("retention:case:delete", caseId, reason, confirmation),
  },
  backup: {
    create: (passphrase: string): Promise<BackupOperationResult> =>
      ipcRenderer.invoke("backup:create", passphrase),
    inspect: (passphrase: string): Promise<BackupInspectionResult> =>
      ipcRenderer.invoke("backup:inspect", passphrase),
    restore: (
      passphrase: string,
      confirmation: string,
    ): Promise<BackupOperationResult> =>
      ipcRenderer.invoke("backup:restore", passphrase, confirmation),
    openBackupFolder: (): Promise<{ opened: boolean }> =>
      ipcRenderer.invoke("backup:open-backup-folder"),
  },
  diagnostics: {
    bridgeReady: true,
    preloadLoadedAt: new Date().toISOString(),
  },
};

try {
  contextBridge.exposeInMainWorld("gremiaSbv", api);
  contextBridge.exposeInMainWorld("gremiaSbvPreload", {
    ready: true,
    loadedAt: api.diagnostics.preloadLoadedAt,
  });
} catch (error) {
  // This is intentionally logged only to the developer console / terminal.
  // The renderer shows a generic start failure without exposing internals.
  console.error("Gremia.SBV preload bridge could not be exposed", error);
}
