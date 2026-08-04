import { contextBridge, ipcRenderer } from "electron";
import type { ApplicationErrorCode, ApplicationErrorPayload } from "../src/app/core/models/application-error.model.js";
const IPC_ERROR_PREFIX = "GREMIA_SBV_APPLICATION_ERROR:";

class RendererApplicationError extends Error {
  readonly name = "RendererApplicationError";

  constructor(
    readonly code: ApplicationErrorCode,
    message: string,
    readonly operation?: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

function parseApplicationErrorPayload(message: string): ApplicationErrorPayload | null {
  const markerIndex = message.indexOf(IPC_ERROR_PREFIX);
  if (markerIndex < 0) return null;

  try {
    const parsed: unknown = JSON.parse(message.slice(markerIndex + IPC_ERROR_PREFIX.length));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const payload = parsed as Record<string, unknown>;
    if (typeof payload.code !== "string" || typeof payload.message !== "string") return null;
    if (payload.operation !== undefined && typeof payload.operation !== "string") return null;

    return {
      code: payload.code as ApplicationErrorCode,
      message: payload.message,
      ...(typeof payload.operation === "string" ? { operation: payload.operation } : {}),
    };
  } catch {
    return null;
  }
}

async function invokeIpc<T = never>(channel: string, ...args: unknown[]): Promise<T> {
  try {
    return await ipcRenderer.invoke(channel, ...args) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const payload = parseApplicationErrorPayload(message);
    if (payload) {
      throw new RendererApplicationError(
        payload.code,
        payload.message,
        payload.operation,
        { cause: error },
      );
    }
    throw error;
  }
}

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
import type { ComplianceAuditChainStatus, ComplianceDatabaseIntegrityStatus, ComplianceIncidentRecord, ComplianceSelfCheckResult, CreateComplianceIncidentInput, DataSubjectAccessPrefill, DataSubjectAccessRequestInput, UpdateComplianceIncidentInput } from "../src/app/core/models/compliance.model.js";
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
  CreateRecruitingInterviewEventInput,
  CreateRecruitingParticipationInput,
  RecruitingInterviewEventRecord,
  RecruitingParticipationRecord,
  UpdateRecruitingInterviewEventInput,
  UpdateRecruitingParticipationInput,
} from "../src/app/core/models/recruiting-participation.model.js";
import type { CreateSbvControlProtocolInput, SbvControlProtocolRecord, UpdateSbvControlProtocolInput } from "../src/app/core/models/sbv-control-protocol.model.js";
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
  ActivityJournalCategoryPreferenceRecord,
  ActivityJournalEntryRecord,
  ActivityJournalExportOptions,
  ActivityJournalExportResult,
  ActivityJournalLinkRecord,
  ActivityJournalLinkTarget,
  ActivityJournalListFilter,
  ActivityJournalPrefill,
  ActivityJournalPrefillContext,
  ActivityJournalSummary,
  ActivityJournalSummaryFilter,
  CreateActivityJournalEntryInput,
  UpdateActivityJournalEntryInput,
} from "../src/app/core/models/activity-journal.model.js";
import type {
  CreateSbvParticipationViolationInput,
  SbvParticipationViolationDocumentResult,
  SbvParticipationViolationEventRecord,
  SbvParticipationViolationFollowUpResult,
  SbvParticipationViolationGeneratedDocumentRecord,
  SbvParticipationViolationListFilter,
  SbvParticipationViolationRecord,
  SbvParticipationViolationStatusChangeInput,
  SbvParticipationViolationTemplateInput,
  SbvParticipationViolationTemplateValidationResult,
  UpdateSbvParticipationViolationInput,
} from "../src/app/core/models/sbv-participation-violation.model.js";

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
      invokeIpc("security:status"),
    setupInitialPassword: (password: string): Promise<SecurityResult> =>
      invokeIpc("security:setup-initial-password", password),
    unlock: (password: string): Promise<SecurityResult> =>
      invokeIpc("security:unlock", password),
    changePassword: (
      currentPassword: string,
      newPassword: string,
    ): Promise<SecurityResult> =>
      invokeIpc(
        "security:change-password",
        currentPassword,
        newPassword,
      ),
    resetPasswordWithRecoveryKey: (
      recoveryKey: string,
      newPassword: string,
    ): Promise<SecurityResult> =>
      invokeIpc(
        "security:reset-password-with-recovery-key",
        recoveryKey,
        newPassword,
      ),
    destroyLocalVault: (confirmation: string): Promise<SecurityResult> =>
      invokeIpc("security:destroy-local-vault", confirmation),
    lock: (reason?: "manual" | "auto"): Promise<{ locked: boolean }> =>
      invokeIpc("security:lock", reason),
    cleanupTemporaryFiles: (): Promise<{
      deleted: number;
      failed: number;
      remaining: number;
      bytesRemaining: number;
    }> => invokeIpc("security:temp-files:cleanup"),
    temporaryFileStatus: (): Promise<{
      root: string;
      remaining: number;
      bytesRemaining: number;
      oldestRemainingAt?: string;
    }> => invokeIpc("security:temp-files:status"),
  },
  cases: {
    list: (): Promise<CaseRecord[]> => invokeIpc("cases:list"),
    create: (input: CreateCaseInput): Promise<CaseRecord> =>
      invokeIpc("cases:create", input),
    bindLegacyCase: (input: LegacyCaseBindingInput): Promise<LegacyCaseBindingResult> =>
      invokeIpc("cases:bind-legacy", input),
    listNotes: (caseId: string): Promise<CaseNoteRecord[]> =>
      invokeIpc("cases:notes:list", caseId),
    createNote: (input: CreateCaseNoteInput): Promise<CaseNoteRecord> =>
      invokeIpc("cases:notes:create", input),
    updateNote: (
      id: string,
      input: UpdateCaseNoteInput,
    ): Promise<CaseNoteRecord> =>
      invokeIpc("cases:notes:update", id, input),
    deleteNote: (id: string): Promise<{ deleted: boolean }> =>
      invokeIpc("cases:notes:delete", id),
    listDocuments: (caseId: string, measureId?: string): Promise<CaseDocumentRecord[]> =>
      invokeIpc("cases:documents:list", caseId, measureId),
    selectAndImportDocuments: (
      caseId: string,
      containsHealthData = true,
      measureId?: string,
    ): Promise<CaseDocumentRecord[]> =>
      invokeIpc(
        "cases:documents:select-and-import",
        caseId,
        containsHealthData,
        measureId,
      ),
    deleteDocument: (id: string): Promise<{ deleted: boolean }> =>
      invokeIpc("cases:documents:delete", id),
    openDocument: (
      id: string,
    ): Promise<{ opened: boolean; filePath: string }> =>
      invokeIpc("cases:documents:open", id),
    exportDocument: (
      id: string,
      suggestedFileName?: string,
    ): Promise<{ exported: boolean; filePath: string }> =>
      invokeIpc("cases:documents:export", id, suggestedFileName),
    search: (input: CaseContentSearchInput): Promise<CaseSearchResult[]> =>
      invokeIpc("cases:search", input),
  },

  caseHandover: {
    export: (input: CaseHandoverExportInput, suggestedFileName?: string): Promise<CaseHandoverExportResult> =>
      invokeIpc("caseHandover:export", input, suggestedFileName),
    selectFile: (): Promise<{ canceled: true } | { canceled: false; filePath: string; fileName: string }> =>
      invokeIpc("caseHandover:select-file"),
    inspect: (filePath: string, passphrase: string): Promise<CaseHandoverInspectResult> =>
      invokeIpc("caseHandover:inspect", filePath, passphrase),
    selectAndInspect: (passphrase: string): Promise<{ canceled: true } | { canceled: false; filePath: string; fileName: string; inspection: CaseHandoverInspectResult }> =>
      invokeIpc("caseHandover:select-and-inspect", passphrase),
    import: (input: CaseHandoverImportInput): Promise<CaseHandoverImportResult> =>
      invokeIpc("caseHandover:import", input),
    continueExpired: (caseId: string, reason: string): Promise<CaseHandoverContinueExpiredResult> =>
      invokeIpc("caseHandover:continue-expired", caseId, reason),
  },

  caseMeasures: {
    list: (caseId?: string): Promise<CaseMeasureRecord[]> =>
      invokeIpc("caseMeasures:list", caseId),
    create: (input: CreateCaseMeasureInput): Promise<CaseMeasureRecord> =>
      invokeIpc("caseMeasures:create", input),
    update: (
      id: string,
      input: UpdateCaseMeasureInput,
    ): Promise<CaseMeasureRecord> =>
      invokeIpc("caseMeasures:update", id, input),
    listNotes: (
      caseId: string,
      measureType?: CaseMeasureNoteProcessType,
      measureId?: string,
    ): Promise<CaseMeasureNoteRecord[]> =>
      invokeIpc("caseMeasures:notes:list", caseId, measureType, measureId),
    createNote: (input: CreateCaseMeasureNoteInput): Promise<CaseMeasureNoteRecord> =>
      invokeIpc("caseMeasures:notes:create", input),
    updateNote: (
      id: string,
      input: UpdateCaseMeasureNoteInput,
    ): Promise<CaseMeasureNoteRecord> =>
      invokeIpc("caseMeasures:notes:update", id, input),
    deleteNote: (id: string): Promise<{ deleted: boolean }> =>
      invokeIpc("caseMeasures:notes:delete", id),
  },
  contacts: {
    list: (filters?: ContactListFilters): Promise<ContactRecord[]> =>
      invokeIpc("contacts:list", filters),
    create: (input: CreateContactInput): Promise<ContactRecord> =>
      invokeIpc("contacts:create", input),
    update: (id: string, input: UpdateContactInput): Promise<ContactRecord> =>
      invokeIpc("contacts:update", id, input),
    delete: (id: string): Promise<DeleteContactResult> =>
      invokeIpc("contacts:delete", id),
  },

  knowledge: {
    listNorms: (filters?: LegalNormSearchInput): Promise<LegalNormRecord[]> =>
      invokeIpc("knowledge:norms:list", filters),
    getNorm: (id: string): Promise<LegalNormRecord | null> =>
      invokeIpc("knowledge:norms:get", id),
    createNorm: (input: CreateLegalNormInput): Promise<LegalNormRecord> =>
      invokeIpc("knowledge:norms:create", input),
    updateNorm: (
      id: string,
      input: UpdateLegalNormInput,
    ): Promise<LegalNormRecord> =>
      invokeIpc("knowledge:norms:update", id, input),
    linkNormToCase: (
      input: LinkLegalNormToCaseInput,
    ): Promise<CaseLegalReferenceRecord> =>
      invokeIpc("knowledge:cases:link", input),
    listCaseReferences: (caseId: string): Promise<CaseLegalReferenceRecord[]> =>
      invokeIpc("knowledge:cases:list", caseId),
    unlinkNormFromCase: (
      caseId: string,
      legalNormId: string,
    ): Promise<{ deleted: boolean }> =>
      invokeIpc("knowledge:cases:unlink", caseId, legalNormId),
    listComments: (legalNormId: string): Promise<NormCommentRecord[]> =>
      invokeIpc("knowledge:comments:list", legalNormId),
    createComment: (
      input: CreateNormCommentInput,
    ): Promise<NormCommentRecord> =>
      invokeIpc("knowledge:comments:create", input),
    listCaseLaw: (legalNormId: string): Promise<CaseLawRecord[]> =>
      invokeIpc("knowledge:caselaw:list", legalNormId),
    createCaseLaw: (input: CreateCaseLawInput): Promise<CaseLawRecord> =>
      invokeIpc("knowledge:caselaw:create", input),
    listChecklist: (legalNormId: string): Promise<NormChecklistItemRecord[]> =>
      invokeIpc("knowledge:checklist:list", legalNormId),
    createChecklistItem: (
      input: CreateNormChecklistItemInput,
    ): Promise<NormChecklistItemRecord> =>
      invokeIpc("knowledge:checklist:create", input),
    exportPreview: (): Promise<KnowledgeExportPreview> =>
      invokeIpc("knowledge:export:preview"),
  },

  prevention: {
    steps: (): Promise<PreventionStepDefinition[]> =>
      invokeIpc("prevention:steps"),
    list: (caseId?: string): Promise<PreventionProcessRecord[]> =>
      invokeIpc("prevention:list", caseId),
    dashboard: (): Promise<PreventionDashboardSummary> =>
      invokeIpc("prevention:dashboard"),
    create: (
      input: CreatePreventionProcessInput,
    ): Promise<PreventionProcessRecord> =>
      invokeIpc("prevention:create", input),
    update: (
      id: string,
      input: UpdatePreventionProcessInput,
    ): Promise<PreventionProcessRecord> =>
      invokeIpc("prevention:update", id, input),
    warnings: (id: string): Promise<PreventionWarning[]> =>
      invokeIpc("prevention:warnings", id),
  },
  participation: {
    list: (caseId?: string): Promise<ParticipationRecord[]> =>
      invokeIpc("participation:list", caseId),
    dashboard: (): Promise<ParticipationDashboardSummary> =>
      invokeIpc("participation:dashboard"),
    create: (input: CreateParticipationInput): Promise<ParticipationRecord> =>
      invokeIpc("participation:create", input),
    update: (
      id: string,
      input: UpdateParticipationInput,
    ): Promise<ParticipationRecord> =>
      invokeIpc("participation:update", id, input),
    warnings: (id: string): Promise<ParticipationWarning[]> =>
      invokeIpc("participation:warnings", id),
  },
  recruitingParticipations: {
    list: (): Promise<RecruitingParticipationRecord[]> =>
      invokeIpc("recruitingParticipations:list"),
    get: (id: string): Promise<RecruitingParticipationRecord | null> =>
      invokeIpc("recruitingParticipations:get", id),
    create: (input: CreateRecruitingParticipationInput): Promise<RecruitingParticipationRecord> =>
      invokeIpc("recruitingParticipations:create", input),
    update: (id: string, input: UpdateRecruitingParticipationInput): Promise<RecruitingParticipationRecord> =>
      invokeIpc("recruitingParticipations:update", id, input),
    delete: (id: string): Promise<{ deleted: boolean }> =>
      invokeIpc("recruitingParticipations:delete", id),
    listInterviews: (recruitingParticipationId: string): Promise<RecruitingInterviewEventRecord[]> =>
      invokeIpc("recruitingParticipations:interviews:list", recruitingParticipationId),
    addInterview: (input: CreateRecruitingInterviewEventInput): Promise<RecruitingInterviewEventRecord> =>
      invokeIpc("recruitingParticipations:interviews:create", input),
    updateInterview: (id: string, input: UpdateRecruitingInterviewEventInput): Promise<RecruitingInterviewEventRecord> =>
      invokeIpc("recruitingParticipations:interviews:update", id, input),
    deleteInterview: (id: string): Promise<{ deleted: boolean }> =>
      invokeIpc("recruitingParticipations:interviews:delete", id),
  },

  sbvResources: {
    list: (): Promise<SbvResourceRecord[]> => invokeIpc("sbvResources:list"),
    dashboard: (): Promise<SbvResourceDashboardSummary> => invokeIpc("sbvResources:dashboard"),
    create: (input: CreateSbvResourceRecordInput): Promise<SbvResourceRecord> => invokeIpc("sbvResources:create", input),
    update: (id: string, input: UpdateSbvResourceRecordInput): Promise<SbvResourceRecord> => invokeIpc("sbvResources:update", id, input),
    delete: (id: string): Promise<{ deleted: boolean }> => invokeIpc("sbvResources:delete", id),
  },

  sbvControlProtocols: {
    list: (): Promise<SbvControlProtocolRecord[]> => invokeIpc("sbvControlProtocols:list"),
    create: (input: CreateSbvControlProtocolInput): Promise<SbvControlProtocolRecord> => invokeIpc("sbvControlProtocols:create", input),
    update: (id: string, input: UpdateSbvControlProtocolInput): Promise<SbvControlProtocolRecord> => invokeIpc("sbvControlProtocols:update", id, input),
    delete: (id: string): Promise<{ deleted: boolean }> => invokeIpc("sbvControlProtocols:delete", id),
  },

  workplaceAccommodation: {
    list: (caseId?: string): Promise<WorkplaceAccommodationRecord[]> =>
      invokeIpc("workplaceAccommodation:list", caseId),
    dashboard: (): Promise<WorkplaceAccommodationDashboardSummary> =>
      invokeIpc("workplaceAccommodation:dashboard"),
    create: (input: CreateWorkplaceAccommodationInput): Promise<WorkplaceAccommodationRecord> =>
      invokeIpc("workplaceAccommodation:create", input),
    update: (
      id: string,
      input: UpdateWorkplaceAccommodationInput,
    ): Promise<WorkplaceAccommodationRecord> =>
      invokeIpc("workplaceAccommodation:update", id, input),
    warnings: (id: string): Promise<WorkplaceAccommodationWarning[]> =>
      invokeIpc("workplaceAccommodation:warnings", id),
  },
  bem: {
    steps: (): Promise<BemStepDefinition[]> => invokeIpc("bem:steps"),
    list: (caseId?: string): Promise<BemProcessRecord[]> =>
      invokeIpc("bem:list", caseId),
    dashboard: (): Promise<BemDashboardSummary> =>
      invokeIpc("bem:dashboard"),
    create: (input: CreateBemProcessInput): Promise<BemProcessRecord> =>
      invokeIpc("bem:create", input),
    update: (
      id: string,
      input: UpdateBemProcessInput,
    ): Promise<BemProcessRecord> => invokeIpc("bem:update", id, input),
    warnings: (id: string): Promise<BemWarning[]> =>
      invokeIpc("bem:warnings", id),
  },
  equalization: {
    steps: (): Promise<string[]> => invokeIpc("equalization:steps"),
    list: (caseId?: string): Promise<EqualizationProcessRecord[]> =>
      invokeIpc("equalization:list", caseId),
    create: (
      input: CreateEqualizationProcessInput,
    ): Promise<EqualizationProcessRecord> =>
      invokeIpc("equalization:create", input),
    update: (
      id: string,
      input: UpdateEqualizationProcessInput,
    ): Promise<EqualizationProcessRecord> =>
      invokeIpc("equalization:update", id, input),
    warnings: (id: string): Promise<EqualizationWarning[]> =>
      invokeIpc("equalization:warnings", id),
  },
  termination: {
    steps: (): Promise<string[]> => invokeIpc("termination:steps"),
    list: (caseId?: string): Promise<TerminationHearingRecord[]> =>
      invokeIpc("termination:list", caseId),
    create: (
      input: CreateTerminationHearingInput,
    ): Promise<TerminationHearingRecord> =>
      invokeIpc("termination:create", input),
    update: (
      id: string,
      input: UpdateTerminationHearingInput,
    ): Promise<TerminationHearingRecord> =>
      invokeIpc("termination:update", id, input),
    warnings: (id: string): Promise<TerminationHearingWarning[]> =>
      invokeIpc("termination:warnings", id),
  },

  compliance: {
    auditChainStatus: (): Promise<ComplianceAuditChainStatus> =>
      invokeIpc("compliance:audit-chain-status"),
    databaseIntegrityStatus: (): Promise<ComplianceDatabaseIntegrityStatus> =>
      invokeIpc("compliance:database-integrity-status"),
    prefillDsar: (input: DataSubjectAccessRequestInput): Promise<DataSubjectAccessPrefill> =>
      invokeIpc("compliance:dsar-prefill", input),
    selfCheck: (): Promise<ComplianceSelfCheckResult> =>
      invokeIpc("compliance:self-check"),
    listIncidents: (): Promise<ComplianceIncidentRecord[]> =>
      invokeIpc("compliance:incidents:list"),
    createIncident: (input: CreateComplianceIncidentInput): Promise<ComplianceIncidentRecord> =>
      invokeIpc("compliance:incidents:create", input),
    updateIncident: (id: string, input: UpdateComplianceIncidentInput): Promise<ComplianceIncidentRecord> =>
      invokeIpc("compliance:incidents:update", id, input),
  },

  persons: {
    list: (filters?: ProtectedPersonListFilters): Promise<ProtectedPersonRecord[]> =>
      invokeIpc("persons:list", filters),
    create: (input: CreateProtectedPersonInput): Promise<ProtectedPersonRecord> =>
      invokeIpc("persons:create", input),
    createAnonymousRequest: (label?: string): Promise<ProtectedPersonRecord> =>
      invokeIpc("persons:create-anonymous-request", label),
    update: (id: string, input: UpdateProtectedPersonInput): Promise<ProtectedPersonRecord> =>
      invokeIpc("persons:update", id, input),
    linkCase: (personId: string, caseId: string, reason?: string): Promise<PersonCaseLinkRecord> =>
      invokeIpc("persons:link-case", personId, caseId, reason),
    previewImport: (input: PersonImportPreviewInput): Promise<PersonImportPreviewResult> =>
      invokeIpc("persons:import:preview", input),
    executeImport: (input: PersonImportExecuteInput): Promise<PersonImportExecuteResult> =>
      invokeIpc("persons:import:execute", input),
    selectImportFile: (): Promise<{ filePath: string; sourceFileName: string; fileType: 'csv' | 'xlsx' } | null> =>
      invokeIpc("persons:import:select-preview"),
    evaluateExpiry: (referenceIso?: string): Promise<PersonStatusExpirySummary> =>
      invokeIpc("persons:expiry:evaluate", referenceIso),
    anonymize: (id: string, reason: string): Promise<PersonAnonymizationResult> =>
      invokeIpc("persons:anonymize", id, reason),
    delete: (id: string, reason: string): Promise<{ ok: true; affectedCaseIds: string[]; deletedPersonId: string }> =>
      invokeIpc("persons:delete", id, reason),
  },

  privacyReview: {
    listOpenForPerson: (protectedPersonId: string): Promise<PrivacyReviewItemRecord[]> =>
      invokeIpc("privacy-review:list-open-for-person", protectedPersonId),
    documentRetention: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
      invokeIpc("privacy-review:document-retention", input),
    scheduleLater: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
      invokeIpc("privacy-review:schedule-later", input),
    clearCase: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
      invokeIpc("privacy-review:clear-case", input),
    anonymizeCase: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
      invokeIpc("privacy-review:anonymize-case", input),
    deleteCase: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
      invokeIpc("privacy-review:delete-case", input),
    bulkMarkClosedLegacy: (): Promise<PrivacyReviewBulkResult> =>
      invokeIpc("privacy-review:bulk-mark-closed-legacy"),
  },
  deadlines: {
    list: (filters?: DeadlineListFilters): Promise<DeadlineRecord[]> =>
      invokeIpc("deadlines:list", filters),
    dashboard: (): Promise<DeadlineDashboardItem[]> =>
      invokeIpc("deadlines:dashboard"),
    create: (input: CreateDeadlineInput): Promise<DeadlineRecord> =>
      invokeIpc("deadlines:create", input),
    update: (id: string, input: UpdateDeadlineInput): Promise<DeadlineRecord> =>
      invokeIpc("deadlines:update", id, input),
    complete: (id: string, note?: string): Promise<DeadlineRecord> =>
      invokeIpc("deadlines:complete", id, note),
    suspend: (id: string, reason: string): Promise<DeadlineRecord> =>
      invokeIpc("deadlines:suspend", id, reason),
    cancel: (id: string, reason: string): Promise<DeadlineRecord> =>
      invokeIpc("deadlines:cancel", id, reason),
    exportIcal: (filters?: DeadlineListFilters, privacyLevel?: "privacy_first" | "process_type" | "case_reference" | "details"): Promise<string> =>
      invokeIpc("deadlines:ical-export", filters, privacyLevel),
  },

  gremiaBr: {
    getSettings: (): Promise<GremiaBrPublicSettings> =>
      invokeIpc("gremia-br:settings:get"),
    saveSettings: (input: GremiaBrSettingsInput): Promise<GremiaBrPublicSettings> =>
      invokeIpc("gremia-br:settings:save", input),
    clearCredentials: (): Promise<GremiaBrPublicSettings> =>
      invokeIpc("gremia-br:credentials:clear"),
    saveRelevanceSettings: (input: GremiaBrRelevanceSettings): Promise<GremiaBrPublicSettings> =>
      invokeIpc("gremia-br:relevance:save", input),
    testConnection: (): Promise<GremiaBrConnectionTestResult> =>
      invokeIpc("gremia-br:connection:test"),
    getCachedOverview: (): Promise<GremiaBrCachedOverview> =>
      invokeIpc("gremia-br:cache:get"),
    getDashboardOverview: (): Promise<GremiaBrDashboardOverview> =>
      invokeIpc("gremia-br:dashboard:get"),
    refreshCache: (): Promise<GremiaBrCacheRefreshResult> =>
      invokeIpc("gremia-br:cache:refresh"),
    suggestInlineReferences: (query: string): Promise<GremiaBrInlineSuggestion[]> =>
      invokeIpc("gremia-br:inline:suggest", query),
    listExternalReferences: (caseId: string): Promise<GremiaBrExternalReferenceRecord[]> =>
      invokeIpc("gremia-br:references:list", caseId),
    saveExternalReference: (input: CreateGremiaBrExternalReferenceInput): Promise<GremiaBrExternalReferenceRecord> =>
      invokeIpc("gremia-br:references:create", input),
    deleteExternalReference: (referenceId: string): Promise<{ deleted: boolean }> =>
      invokeIpc("gremia-br:references:delete", referenceId),
  },
  templateDefaults: {
    list: (): Promise<TemplateDefaultValues> =>
      invokeIpc("template-defaults:list"),
    save: (values: TemplateDefaultValues): Promise<TemplateDefaultValues> =>
      invokeIpc("template-defaults:save", values),
  },
  reports: {
    descriptors: (): Promise<ReportDescriptor[]> =>
      invokeIpc("reports:descriptors"),
    history: (limit?: number): Promise<ReportExportHistoryItem[]> =>
      invokeIpc("reports:history", limit),
    generate: (input: GenerateReportInput): Promise<ReportGenerationResult> =>
      invokeIpc("reports:generate", input),
    openExportFolder: (filePath?: string): Promise<{ opened: boolean }> =>
      invokeIpc("reports:open-export-folder", filePath),
  },
  templates: {
    list: (filters?: TemplateListFilters): Promise<TemplateRecord[]> =>
      invokeIpc("templates:list", filters),
    create: (input: CreateTemplateInput): Promise<TemplateRecord> =>
      invokeIpc("templates:create", input),
    update: (id: string, input: UpdateTemplateInput): Promise<TemplateRecord> =>
      invokeIpc("templates:update", id, input),
    delete: (id: string): Promise<{ deleted: boolean }> =>
      invokeIpc("templates:delete", id),
    render: (input: RenderTemplateInput): Promise<RenderedTemplateResult> =>
      invokeIpc("templates:render", input),
    renderContext: (
      input: RenderContextTemplateInput,
    ): Promise<RenderedTemplateResult> =>
      invokeIpc("templates:render-context", input),
  },

  retention: {
    dashboard: (): Promise<RetentionDashboard> =>
      invokeIpc("retention:dashboard"),
    getSettings: (): Promise<RetentionSettings> =>
      invokeIpc("retention:settings:get"),
    updateSettings: (
      input: UpdateRetentionSettingsInput,
    ): Promise<RetentionSettings> =>
      invokeIpc("retention:settings:update", input),
    anonymizeCase: (
      caseId: string,
      reason: string,
      confirmation: string,
    ): Promise<RetentionOperationResult> =>
      invokeIpc(
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
      invokeIpc("retention:case:delete", caseId, reason, confirmation),
  },
  backup: {
    create: (passphrase: string): Promise<BackupOperationResult> =>
      invokeIpc("backup:create", passphrase),
    inspect: (passphrase: string): Promise<BackupInspectionResult> =>
      invokeIpc("backup:inspect", passphrase),
    restore: (
      passphrase: string,
      confirmation: string,
    ): Promise<BackupOperationResult> =>
      invokeIpc("backup:restore", passphrase, confirmation),
    openBackupFolder: (): Promise<{ opened: boolean }> =>
      invokeIpc("backup:open-backup-folder"),
  },

  activityJournal: {
    list: (filter?: ActivityJournalListFilter): Promise<ActivityJournalEntryRecord[]> =>
      invokeIpc("activityJournal:list", filter),
    get: (id: string): Promise<ActivityJournalEntryRecord | null> =>
      invokeIpc("activityJournal:get", id),
    create: (input: CreateActivityJournalEntryInput): Promise<ActivityJournalEntryRecord> =>
      invokeIpc("activityJournal:create", input),
    update: (id: string, input: UpdateActivityJournalEntryInput): Promise<ActivityJournalEntryRecord> =>
      invokeIpc("activityJournal:update", id, input),
    delete: (id: string): Promise<{ deleted: boolean }> =>
      invokeIpc("activityJournal:delete", id),
    listLinks: (entryId: string): Promise<ActivityJournalLinkRecord[]> =>
      invokeIpc("activityJournal:links:list", entryId),
    addLink: (entryId: string, target: ActivityJournalLinkTarget): Promise<ActivityJournalLinkRecord> =>
      invokeIpc("activityJournal:links:add", entryId, target),
    removeLink: (entryId: string, linkId: string): Promise<{ deleted: boolean }> =>
      invokeIpc("activityJournal:links:remove", entryId, linkId),
    summary: (filter?: ActivityJournalSummaryFilter): Promise<ActivityJournalSummary> =>
      invokeIpc("activityJournal:summary", filter),
    export: (filter?: ActivityJournalListFilter, mode?: "summary" | "detailed", options?: ActivityJournalExportOptions): Promise<ActivityJournalExportResult> =>
      invokeIpc("activityJournal:export", filter, mode, options),
    buildPrefillFromContext: (context: ActivityJournalPrefillContext): Promise<ActivityJournalPrefill> =>
      invokeIpc("activityJournal:prefill:context", context),
    buildPrefillFromDeadline: (deadline: DeadlineRecord): Promise<ActivityJournalPrefill> =>
      invokeIpc("activityJournal:prefill:deadline", deadline),
    buildPrefillFromClosedDeadline: (deadline: DeadlineRecord): Promise<ActivityJournalPrefill> =>
      invokeIpc("activityJournal:prefill:closed-deadline", deadline),
    getPreferredCategory: (contextType: ActivityJournalPrefillContext["contextType"]): Promise<ActivityJournalCategoryPreferenceRecord["category"] | undefined> =>
      invokeIpc("activityJournal:preferences:get", contextType),
    rememberCategory: (contextType: ActivityJournalPrefillContext["contextType"], category: ActivityJournalCategoryPreferenceRecord["category"]): Promise<ActivityJournalCategoryPreferenceRecord> =>
      invokeIpc("activityJournal:preferences:remember", contextType, category),
  },

  sbvParticipationViolations: {
    list: (filter?: SbvParticipationViolationListFilter): Promise<SbvParticipationViolationRecord[]> =>
      invokeIpc("sbvParticipationViolations:list", filter),
    get: (id: string): Promise<SbvParticipationViolationRecord | null> =>
      invokeIpc("sbvParticipationViolations:get", id),
    listEvents: (id: string): Promise<SbvParticipationViolationEventRecord[]> =>
      invokeIpc("sbvParticipationViolations:events:list", id),
    create: (input: CreateSbvParticipationViolationInput): Promise<SbvParticipationViolationRecord> =>
      invokeIpc("sbvParticipationViolations:create", input),
    update: (id: string, input: UpdateSbvParticipationViolationInput): Promise<SbvParticipationViolationRecord> =>
      invokeIpc("sbvParticipationViolations:update", id, input),
    changeStatus: (id: string, input: SbvParticipationViolationStatusChangeInput): Promise<SbvParticipationViolationRecord> =>
      invokeIpc("sbvParticipationViolations:status", id, input),
    validateTemplate: (input: SbvParticipationViolationTemplateInput): Promise<SbvParticipationViolationTemplateValidationResult> =>
      invokeIpc("sbvParticipationViolations:template:validate", input),
    generateDocument: (id: string, options?: Partial<Pick<SbvParticipationViolationTemplateInput, "recipientLabel" | "privacyMode" | "includeLegalReviewHint" | "includeOwiHint">>): Promise<SbvParticipationViolationDocumentResult> =>
      invokeIpc("sbvParticipationViolations:documents:generate", id, options),
    listDocuments: (id: string): Promise<SbvParticipationViolationGeneratedDocumentRecord[]> =>
      invokeIpc("sbvParticipationViolations:documents:list", id),
    createFollowUp: (id: string, dueAt?: string): Promise<SbvParticipationViolationFollowUpResult> =>
      invokeIpc("sbvParticipationViolations:followUp:create", id, dueAt),
    buildJournalPrefill: (id: string): Promise<ActivityJournalPrefill> =>
      invokeIpc("sbvParticipationViolations:journal:prefill", id),
    delete: (id: string): Promise<{ deleted: boolean }> =>
      invokeIpc("sbvParticipationViolations:delete", id),
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
