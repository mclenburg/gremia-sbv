/// <reference types="vite/client" />
import type { ComplianceAuditChainStatus, ComplianceDatabaseIntegrityStatus, ComplianceIncidentRecord, ComplianceSelfCheckResult, CreateComplianceIncidentInput, DataSubjectAccessPrefill, DataSubjectAccessRequestInput, UpdateComplianceIncidentInput } from "./domain/models/compliance.model";

import type { CaseDocumentRecord } from "./domain/models/case-document.model";
import type { CaseHandoverContinueExpiredResult, CaseHandoverExportInput, CaseHandoverExportResult, CaseHandoverImportInput, CaseHandoverImportResult, CaseHandoverInspectResult } from "./domain/models/case-handover.model";
import type { CaseRecord, CreateCaseInput, LegacyCaseBindingInput, LegacyCaseBindingResult } from "./domain/models/case.model";
import type {
  ContactListFilters,
  ContactRecord,
  CreateContactInput,
  DeleteContactResult,
  UpdateContactInput,
} from "./domain/models/contact.model";
import type {
  CaseMeasureNoteProcessType,
  CaseMeasureNoteRecord,
  CaseMeasureRecord,
  CreateCaseMeasureInput,
  DeleteCaseProcessInput,
  DeleteCaseProcessResult,
  CreateCaseMeasureNoteInput,
  UpdateCaseMeasureInput,
  UpdateCaseMeasureNoteInput,
} from "./domain/models/case-measure.model";
import type {
  CaseContentSearchInput,
  CaseNoteRecord,
  CaseSearchResult,
  CreateCaseNoteInput,
  UpdateCaseNoteInput,
} from "./domain/models/case-note.model";
import type {
  CreateDeadlineInput,
  DeadlineDashboardItem,
  DeadlineListFilters,
  DeadlineRecord,
  UpdateDeadlineInput,
} from "./domain/models/deadline.model";
import type { CaseAnonymizationMode, PrivacyReviewActionInput, PrivacyReviewActionResult, PrivacyReviewBulkResult, PrivacyReviewItemRecord } from "./domain/models/privacy-review.model";
import type {
  SecurityResult,
  SecurityStatus,
} from "./domain/models/security.model";
import type {
  GenerateReportInput,
  ReportDescriptor,
  ReportExportHistoryItem,
  ReportGenerationResult,
} from "./domain/models/report.model";
import type {
  BackupInspectionResult,
  BackupOperationResult,
} from "./domain/models/backup.model";
import type {
  RetentionDashboard,
  RetentionOperationResult,
  RetentionSettings,
  UpdateRetentionSettingsInput,
} from "./domain/models/retention.model";
import type {
  CreatePreventionProcessInput,
  PreventionDashboardSummary,
  PreventionProcessRecord,
  PreventionStepDefinition,
  PreventionWarning,
  UpdatePreventionProcessInput,
} from "./domain/models/prevention.model";
import type {
  CreateParticipationInput,
  ParticipationDashboardSummary,
  ParticipationRecord,
  ParticipationWarning,
  UpdateParticipationInput,
} from "./domain/models/participation.model";
import type {
  CreateRecruitingInterviewEventInput,
  CreateRecruitingParticipationInput,
  RecruitingInterviewEventRecord,
  RecruitingParticipationRecord,
  UpdateRecruitingInterviewEventInput,
  UpdateRecruitingParticipationInput,
} from "./domain/models/recruiting-participation.model";
import type { CreateSbvControlProtocolInput, SbvControlProtocolRecord, UpdateSbvControlProtocolInput } from "./domain/models/sbv-control-protocol.model";
import type {
  CreateWorkplaceAccommodationInput,
  UpdateWorkplaceAccommodationInput,
  WorkplaceAccommodationDashboardSummary,
  WorkplaceAccommodationRecord,
  WorkplaceAccommodationWarning,
} from "./domain/models/workplace-accommodation.model";
import type {
  BemDashboardSummary,
  BemProcessRecord,
  BemStepDefinition,
  BemWarning,
  CreateBemProcessInput,
  UpdateBemProcessInput,
} from "./domain/models/bem.model";
import type {
  CreateEqualizationProcessInput,
  EqualizationProcessRecord,
  EqualizationWarning,
  UpdateEqualizationProcessInput,
} from "./domain/models/equalization.model";
import type {
  CreateTerminationHearingInput,
  TerminationHearingRecord,
  TerminationHearingWarning,
  UpdateTerminationHearingInput,
} from "./domain/models/termination.model";
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
} from "./domain/models/knowledge.model";
import type { TemplateDefaultValues } from "./domain/models/template-default.model";
import type { CreateGremiaBrExternalReferenceInput, GremiaBrCachedOverview, GremiaBrCacheRefreshResult, GremiaBrConnectionTestResult, GremiaBrDashboardOverview, GremiaBrExternalReferenceRecord, GremiaBrInlineSuggestion, GremiaBrPublicSettings, GremiaBrRelevanceSettings, GremiaBrSettingsInput } from "./domain/models/gremia-br.model";

import type {
  CreateTemplateInput,
  RenderContextTemplateInput,
  RenderTemplateInput,
  RenderedTemplateResult,
  TemplateListFilters,
  TemplateRecord,
  UpdateTemplateInput,
} from "./domain/models/template.model";
import type { CreateSbvResourceRecordInput, SbvResourceDashboardSummary, SbvResourceRecord, UpdateSbvResourceRecordInput } from "./domain/models/sbv-resource.model";
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
} from "./domain/models/activity-journal.model";
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
} from "./domain/models/sbv-participation-violation.model";

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
} from "./domain/models/protected-person.model";

import type {
  SbvMeetingRecord, SbvMeetingAgendaItemRecord, CreateSbvMeetingInput, UpdateSbvMeetingInput, UpsertSbvMeetingAgendaInput,
  SbvAssemblyRecord, SaveSbvAssemblyInput, EmployerObligationReviewRecord, SaveEmployerObligationReviewInput,
  InclusionOfficerSnapshotRecord, SaveInclusionOfficerSnapshotInput, InclusionAgreementRecord, SaveInclusionAgreementInput,
  InclusionAgreementTopicRecord, SaveInclusionAgreementTopicInput, ComplaintWorkflowRecord, SaveComplaintWorkflowInput, QuickCaseTemplate,
} from "./domain/models/sbv-office-workflow.model";
import type {
  ConfigureElectionSetupInput, CreateElectionInput, ElectionBoardMemberRecord, ElectionBoardSessionRecord, ElectionCandidateRecord,
  ElectionObjectionRecord, ElectionPreparationOverview, ElectionProposalRecord, ElectionRecord, ElectionSetupAssessment, ElectionVoterFileImportInput, ElectionVoterFileImportResult, ElectionVoterImportFileSelection, ElectionVoterRecord, ElectionVoterSyncResult,
  GenerateElectionPreparationDocumentInput, SaveElectionBoardMemberInput, SaveElectionBoardSessionInput, SaveElectionCandidateInput,
  SaveElectionObjectionInput, SaveElectionProposalInput, SaveElectionVoterInput,
} from "./domain/models/election-workflow.model";
import type {
  ElectionCloseInput, ElectionDayChecklistInput, ElectionDocumentExportResult, ElectionExecutionOverview, ElectionMailBallotRecord, ElectionPhysicalRecord, ElectionResultRecord,
  ElectionTransferFileExportResult, ElectionTransferFileSelection, ElectionTransferInspection, GenerateElectionExecutionDocumentInput, RecordElectionAcceptanceInput, RecordElectionLotInput,
  RecordElectionTotalsInput, SaveElectionMailBallotInput, SaveElectionPhysicalRecordInput,
} from "./domain/models/election-execution.model";
import type { ElectionTransferEnvelope } from "../services/electionTransferCryptoAdapter";
import type { ElectionTransferImportResult } from "../services/electionTransferImportService";
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
        deleteProcess(input: DeleteCaseProcessInput): Promise<DeleteCaseProcessResult>;
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
      recruitingParticipations: {
        list(): Promise<RecruitingParticipationRecord[]>;
        get(id: string): Promise<RecruitingParticipationRecord | null>;
        create(input: CreateRecruitingParticipationInput): Promise<RecruitingParticipationRecord>;
        update(id: string, input: UpdateRecruitingParticipationInput): Promise<RecruitingParticipationRecord>;
        delete(id: string): Promise<{ deleted: boolean }>;
        listInterviews(recruitingParticipationId: string): Promise<RecruitingInterviewEventRecord[]>;
        addInterview(input: CreateRecruitingInterviewEventInput): Promise<RecruitingInterviewEventRecord>;
        updateInterview(id: string, input: UpdateRecruitingInterviewEventInput): Promise<RecruitingInterviewEventRecord>;
        deleteInterview(id: string): Promise<{ deleted: boolean }>;
      };

      sbvResources: {
        list(): Promise<SbvResourceRecord[]>;
        dashboard(): Promise<SbvResourceDashboardSummary>;
        create(input: CreateSbvResourceRecordInput): Promise<SbvResourceRecord>;
        update(id: string, input: UpdateSbvResourceRecordInput): Promise<SbvResourceRecord>;
        delete(id: string): Promise<{ deleted: boolean }>;
      };

      sbvControlProtocols: {
        list(): Promise<SbvControlProtocolRecord[]>;
        create(input: CreateSbvControlProtocolInput): Promise<SbvControlProtocolRecord>;
        update(id: string, input: UpdateSbvControlProtocolInput): Promise<SbvControlProtocolRecord>;
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
        selfCheck(): Promise<ComplianceSelfCheckResult>;
        listIncidents(): Promise<ComplianceIncidentRecord[]>;
        createIncident(input: CreateComplianceIncidentInput): Promise<ComplianceIncidentRecord>;
        updateIncident(id: string, input: UpdateComplianceIncidentInput): Promise<ComplianceIncidentRecord>;
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

      activityJournal: {
        list(filter?: ActivityJournalListFilter): Promise<ActivityJournalEntryRecord[]>;
        get(id: string): Promise<ActivityJournalEntryRecord | null>;
        create(input: CreateActivityJournalEntryInput): Promise<ActivityJournalEntryRecord>;
        update(id: string, input: UpdateActivityJournalEntryInput): Promise<ActivityJournalEntryRecord>;
        delete(id: string): Promise<{ deleted: boolean }>;
        listLinks(entryId: string): Promise<ActivityJournalLinkRecord[]>;
        addLink(entryId: string, target: ActivityJournalLinkTarget): Promise<ActivityJournalLinkRecord>;
        removeLink(entryId: string, linkId: string): Promise<{ deleted: boolean }>;
        summary(filter?: ActivityJournalSummaryFilter): Promise<ActivityJournalSummary>;
        export(filter?: ActivityJournalListFilter, mode?: "summary" | "detailed", options?: ActivityJournalExportOptions): Promise<ActivityJournalExportResult>;
        buildPrefillFromContext(context: ActivityJournalPrefillContext): Promise<ActivityJournalPrefill>;
        buildPrefillFromDeadline(deadline: DeadlineRecord): Promise<ActivityJournalPrefill>;
        buildPrefillFromClosedDeadline(deadline: DeadlineRecord): Promise<ActivityJournalPrefill>;
        getPreferredCategory(contextType: ActivityJournalPrefillContext["contextType"]): Promise<ActivityJournalCategoryPreferenceRecord["category"] | undefined>;
        rememberCategory(contextType: ActivityJournalPrefillContext["contextType"], category: ActivityJournalCategoryPreferenceRecord["category"]): Promise<ActivityJournalCategoryPreferenceRecord>;
      };


      sbvParticipationViolations: {
        list(filter?: SbvParticipationViolationListFilter): Promise<SbvParticipationViolationRecord[]>;
        get(id: string): Promise<SbvParticipationViolationRecord | null>;
        listEvents(id: string): Promise<SbvParticipationViolationEventRecord[]>;
        create(input: CreateSbvParticipationViolationInput): Promise<SbvParticipationViolationRecord>;
        update(id: string, input: UpdateSbvParticipationViolationInput): Promise<SbvParticipationViolationRecord>;
        changeStatus(id: string, input: SbvParticipationViolationStatusChangeInput): Promise<SbvParticipationViolationRecord>;
        validateTemplate(input: SbvParticipationViolationTemplateInput): Promise<SbvParticipationViolationTemplateValidationResult>;
        generateDocument(id: string, options?: Partial<Pick<SbvParticipationViolationTemplateInput, "recipientLabel" | "privacyMode" | "includeLegalReviewHint" | "includeOwiHint">>): Promise<SbvParticipationViolationDocumentResult>;
        listDocuments(id: string): Promise<SbvParticipationViolationGeneratedDocumentRecord[]>;
        createFollowUp(id: string, dueAt?: string): Promise<SbvParticipationViolationFollowUpResult>;
        buildJournalPrefill(id: string): Promise<ActivityJournalPrefill>;
        delete(id: string): Promise<{ deleted: boolean }>;
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
        openExportFolder(fileName?: string): Promise<{ opened: boolean }>;
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
        openPdf(input: Pick<RenderedTemplateResult, 'title' | 'subject' | 'body'>): Promise<{ opened: boolean }>;
      };

      elections: {
        list(): Promise<ElectionRecord[]>;
        get(id: string): Promise<ElectionRecord>;
        create(input: CreateElectionInput): Promise<ElectionRecord>;
        configureSetup(id: string, input: ConfigureElectionSetupInput): Promise<ElectionSetupAssessment>;
        overview(id: string): Promise<ElectionPreparationOverview>;
        saveVoter(id: string, input: SaveElectionVoterInput): Promise<ElectionVoterRecord>;
        syncVotersFromPersons(id: string): Promise<ElectionVoterSyncResult>;
        selectVoterImportFile(): Promise<ElectionVoterImportFileSelection>;
        previewVoterImport(input: ElectionVoterFileImportInput): Promise<PersonImportPreviewResult>;
        importVotersFromPersonFile(id: string, input: ElectionVoterFileImportInput): Promise<ElectionVoterFileImportResult>;
        saveBoardMember(id: string, input: SaveElectionBoardMemberInput): Promise<ElectionBoardMemberRecord>;
        saveBoardSession(id: string, input: SaveElectionBoardSessionInput): Promise<ElectionBoardSessionRecord>;
        saveObjection(id: string, input: SaveElectionObjectionInput): Promise<ElectionObjectionRecord>;
        saveCandidate(id: string, input: SaveElectionCandidateInput): Promise<ElectionCandidateRecord>;
        saveProposal(id: string, input: SaveElectionProposalInput): Promise<ElectionProposalRecord>;
        startGracePeriod(id: string, sourceDate: string): Promise<ElectionProposalRecord>;
        recordNoticeIssued(id: string, issueDate: string): Promise<{ recorded: boolean }>;
        markPreparation(id: string): Promise<ElectionRecord>;
        journalPrefill(id: string, activity: 'preparation' | 'board_work' | 'voter_list' | 'nominations' | 'voting' | 'counting' | 'result' | 'archive'): Promise<ActivityJournalPrefill>;
        generateDocument(id: string, input: GenerateElectionPreparationDocumentInput): Promise<{ id: string; filename: string; sha256: string }>;
        executionOverview(id: string): Promise<ElectionExecutionOverview>;
        recordElectionDayChecklist(id: string, input: ElectionDayChecklistInput): Promise<ElectionExecutionOverview>;
        saveMailBallot(id: string, input: SaveElectionMailBallotInput): Promise<ElectionMailBallotRecord>;
        recordTotals(id: string, input: RecordElectionTotalsInput): Promise<ElectionExecutionOverview>;
        recordLotDecision(id: string, input: RecordElectionLotInput): Promise<ElectionResultRecord>;
        recordAcceptance(id: string, input: RecordElectionAcceptanceInput): Promise<ElectionExecutionOverview>;
        savePhysicalRecord(id: string, input: SaveElectionPhysicalRecordInput): Promise<ElectionPhysicalRecord>;
        close(id: string, input: ElectionCloseInput): Promise<{ closed: boolean }>;
        generateExecutionDocument(id: string, input: GenerateElectionExecutionDocumentInput): Promise<{ id: string; filename: string; sha256: string }>;
        exportPdfArchive(id: string): Promise<{ id: string; filename: string; sha256: string }>;
        exportDocument(documentId: string, suggestedFileName?: string): Promise<ElectionDocumentExportResult>;
        exportTransfer(id: string, passphrase: string): Promise<ElectionTransferEnvelope>;
        inspectTransfer(envelope: ElectionTransferEnvelope, passphrase: string): Promise<ElectionTransferInspection>;
        importTransfer(envelope: ElectionTransferEnvelope, passphrase: string): Promise<ElectionTransferImportResult>;
        exportTransferFile(id: string, passphrase: string, suggestedFileName?: string): Promise<ElectionTransferFileExportResult>;
        selectTransferFile(passphrase: string): Promise<ElectionTransferFileSelection>;
        importTransferFile(fileToken: string, passphrase: string): Promise<ElectionTransferImportResult>;
      };
      sbvOffice: {
        meetings: {
          list(): Promise<SbvMeetingRecord[]>;
          create(input: CreateSbvMeetingInput): Promise<SbvMeetingRecord>;
          update(id: string, input: UpdateSbvMeetingInput): Promise<SbvMeetingRecord>;
          journalPrefill(id: string, activity: 'attendance' | 'preparation' | 'top_request' | 'suspension'): Promise<ActivityJournalPrefill>;
          saveAgenda(id: string, input: UpsertSbvMeetingAgendaInput): Promise<SbvMeetingAgendaItemRecord>;
          createAgendaFollowUp(agendaId: string, dueAt: string, title?: string): Promise<unknown>;
        };
        assemblies: { list(): Promise<SbvAssemblyRecord[]>; annualWarning(year: number): Promise<boolean>; createFollowUp(id: string, dueAt: string, title?: string): Promise<unknown>; generateDocument(id: string, kind: 'invitation' | 'agenda' | 'activity_report_draft' | 'result_minutes'): Promise<{ document: { id: string; filename: string; sha256: string }; previewStatus: 'requested' | 'unavailable'; previewMessage?: string }>; save(input: SaveSbvAssemblyInput): Promise<SbvAssemblyRecord>; };
        obligations: { list(): Promise<EmployerObligationReviewRecord[]>; ensureAnnual(year: number): Promise<EmployerObligationReviewRecord[]>; save(input: SaveEmployerObligationReviewInput): Promise<EmployerObligationReviewRecord>; };
        officers: { list(): Promise<InclusionOfficerSnapshotRecord[]>; save(input: SaveInclusionOfficerSnapshotInput): Promise<InclusionOfficerSnapshotRecord>; };
        agreements: { list(): Promise<InclusionAgreementRecord[]>; requestDraft(dueAt?: string): Promise<{ text: string; responseDueAt?: string }>; createResponseDeadline(id: string, dueAt: string): Promise<unknown>; save(input: SaveInclusionAgreementInput): Promise<InclusionAgreementRecord>; saveTopic(id: string, input: SaveInclusionAgreementTopicInput): Promise<InclusionAgreementTopicRecord>; };
        documents: { selectAndAttach(ownerType: 'meeting' | 'assembly' | 'inclusion_agreement' | 'employer_obligation_review', ownerId: string, purpose: string): Promise<Array<{ id: string; filename: string; sha256: string }>>; };
        complaints: { list(): Promise<ComplaintWorkflowRecord[]>; save(input: SaveComplaintWorkflowInput): Promise<ComplaintWorkflowRecord>; templates(): Promise<QuickCaseTemplate[]>; };
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
          anonymizationMode: CaseAnonymizationMode,
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
