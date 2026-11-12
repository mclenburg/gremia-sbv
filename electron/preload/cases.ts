import type { IpcInvoker } from "./invoke.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
import type {
  CaseRecord,
  CreateCaseInput,
  LegacyCaseBindingInput,
  LegacyCaseBindingResult,
} from "../../src/domain/models/case.model.js";
import type {
  CaseContentSearchInput,
  CaseNoteRecord,
  CaseSearchResult,
  CreateCaseNoteInput,
  UpdateCaseNoteInput,
} from "../../src/domain/models/case-note.model.js";
import type { CaseDocumentRecord } from "../../src/domain/models/case-document.model.js";
import type { UnifiedSearchDetail, UnifiedSearchPage, UnifiedSearchQuery } from '../../src/domain/models/unified-search.model.js';
import type { CaseHandoverChecklist, CaseHandoverChecklistInput, CaseHandoverCockpit, CaseHandoverContinueExpiredResult, CaseHandoverExportInput, CaseHandoverExportResult, CaseHandoverImportInput, CaseHandoverImportResult, CaseHandoverInspectResult, CaseHandoverReturnDeltaExportInput } from "../../src/domain/models/case-handover.model.js";
import type { MobileCompanionDevice, MobileCompanionDeviceStatus, MobileCompanionPairingRequestResult, MobileCompanionReturnImportInput, MobileCompanionReturnImportResult, MobileCompanionReturnInspectResult, MobileCompanionSnapshotInput, MobileCompanionSnapshotResult, SaveMobileCompanionDeviceInput } from "../../src/domain/models/mobile-companion.model.js";
import type { VacationV5ReturnImportInput, VacationV5ReturnImportResult,
  VacationV5ReturnReview } from '../../src/domain/transfer/vacationV5ReturnReview.js';
import type { VacationV5ExportRequest, VacationV5ExportResult, VacationV5PackageReview, VacationV5ReturnExportRequest,
  VacationV5SelectionRequest, VacationV5ExportPreview, VacationV5ScopeCandidate,
  VacationV5ReturnExportResult, VacationV5ReturnPackageOption, VacationV5ReturnInventory,
  VacationV5ReturnSelection, VacationV5ReturnExportPreview } from '../../src/domain/transfer/vacationV5File.js';
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
} from "../../src/domain/models/case-measure.model.js";
import type {
  ContactListFilters,
  ContactRecord,
  CreateContactInput,
  DeleteContactResult,
  UpdateContactInput,
} from "../../src/domain/models/contact.model.js";
import type {
  CreateDeadlineInput,
  DeadlineDashboardItem,
  DeadlineListFilters,
  DeadlineRecord,
  UpdateDeadlineInput,
} from "../../src/domain/models/deadline.model.js";

function createCaseHandoverApi(invokeIpc: IpcInvoker) {
  return {
    cockpit: (): Promise<CaseHandoverCockpit> =>
      invokeIpc(IPC_CHANNELS.caseHandoverCockpit),
    checklist: (input: CaseHandoverChecklistInput): Promise<CaseHandoverChecklist> =>
      invokeIpc(IPC_CHANNELS.caseHandoverChecklist, input),
    export: (input: CaseHandoverExportInput, suggestedFileName?: string): Promise<CaseHandoverExportResult> =>
      invokeIpc(IPC_CHANNELS.caseHandoverExport, input, suggestedFileName),
    exportReturnDelta: (input: CaseHandoverReturnDeltaExportInput, suggestedFileName?: string): Promise<CaseHandoverExportResult> =>
      invokeIpc(IPC_CHANNELS.caseHandoverReturnDeltaExport, input, suggestedFileName),
    exportV5: (input: VacationV5ExportRequest, suggestedFileName?: string): Promise<VacationV5ExportResult> =>
      invokeIpc(IPC_CHANNELS.caseHandoverV5Export, input, suggestedFileName),
    listV5Candidates: (expiresAt: string): Promise<VacationV5ScopeCandidate[]> =>
      invokeIpc(IPC_CHANNELS.caseHandoverV5Candidates, expiresAt),
    previewV5Export: (input: VacationV5SelectionRequest): Promise<VacationV5ExportPreview> =>
      invokeIpc(IPC_CHANNELS.caseHandoverV5Preview, input),
    importV5: (fileToken: string, passphrase: string, expectedPackageId: string): Promise<{ importId: string; importedCount: number; packageId: string }> =>
      invokeIpc(IPC_CHANNELS.caseHandoverV5Import, fileToken, passphrase, expectedPackageId),
    reviewV5: (fileToken: string, passphrase: string): Promise<VacationV5PackageReview> =>
      invokeIpc(IPC_CHANNELS.caseHandoverV5Review, fileToken, passphrase),
    exportV5Return: (input: VacationV5ReturnExportRequest, suggestedFileName?: string): Promise<VacationV5ReturnExportResult> =>
      invokeIpc(IPC_CHANNELS.caseHandoverV5ReturnExport, input, suggestedFileName),
    listV5ReturnPackages: (): Promise<VacationV5ReturnPackageOption[]> =>
      invokeIpc(IPC_CHANNELS.caseHandoverV5ReturnPackages),
    reviewV5ReturnExportInventory: (sourcePackageId: string): Promise<VacationV5ReturnInventory> =>
      invokeIpc(IPC_CHANNELS.caseHandoverV5ReturnInventory, sourcePackageId),
    previewV5ReturnExport: (input: VacationV5ReturnSelection): Promise<VacationV5ReturnExportPreview> =>
      invokeIpc(IPC_CHANNELS.caseHandoverV5ReturnPreviewExport, input),
    reviewV5Return: (fileToken: string, passphrase: string): Promise<VacationV5ReturnReview> =>
      invokeIpc(IPC_CHANNELS.caseHandoverV5ReturnReview, fileToken, passphrase),
    importV5Return: (input: VacationV5ReturnImportInput): Promise<VacationV5ReturnImportResult> =>
      invokeIpc(IPC_CHANNELS.caseHandoverV5ReturnImport, input),
    selectFile: (): Promise<{ canceled: true } | { canceled: false; filePath: string; fileName: string }> =>
      invokeIpc(IPC_CHANNELS.caseHandoverSelectFile),
    inspect: (filePath: string, passphrase: string): Promise<CaseHandoverInspectResult> =>
      invokeIpc(IPC_CHANNELS.caseHandoverInspect, filePath, passphrase),
    selectAndInspect: (passphrase: string): Promise<{ canceled: true } | { canceled: false; filePath: string; fileName: string; inspection: CaseHandoverInspectResult }> =>
      invokeIpc(IPC_CHANNELS.caseHandoverSelectAndInspect, passphrase),
    import: (input: CaseHandoverImportInput): Promise<CaseHandoverImportResult> =>
      invokeIpc(IPC_CHANNELS.caseHandoverImport, input),
    continueExpired: (caseId: string, reason: string): Promise<CaseHandoverContinueExpiredResult> =>
      invokeIpc(IPC_CHANNELS.caseHandoverContinueExpired, caseId, reason),
    listMobileDevices: (): Promise<MobileCompanionDevice[]> =>
      invokeIpc(IPC_CHANNELS.caseHandoverMobileDevicesList),
    createMobilePairingRequest: (): Promise<MobileCompanionPairingRequestResult> =>
      invokeIpc(IPC_CHANNELS.caseHandoverMobilePairingRequest),
    exportMobilePairingRequest: (request: string): Promise<boolean> =>
      invokeIpc(IPC_CHANNELS.caseHandoverMobilePairingExport, request),
    readMobilePairingResponse: (): Promise<string | null> =>
      invokeIpc(IPC_CHANNELS.caseHandoverMobilePairingRead),
    cancelMobilePairing: (sessionId: string): Promise<void> => invokeIpc(IPC_CHANNELS.caseHandoverMobilePairingCancel, sessionId),
    saveMobileDevice: (input: SaveMobileCompanionDeviceInput): Promise<MobileCompanionDevice> =>
      invokeIpc(IPC_CHANNELS.caseHandoverMobileDevicesSave, input),
    setMobileDeviceStatus: (id: string, status: MobileCompanionDeviceStatus): Promise<MobileCompanionDevice> =>
      invokeIpc(IPC_CHANNELS.caseHandoverMobileDeviceStatus, id, status),
    createMobileSnapshot: (input: MobileCompanionSnapshotInput): Promise<MobileCompanionSnapshotResult> =>
      invokeIpc(IPC_CHANNELS.caseHandoverMobileSnapshotCreate, input),
    selectAndInspectMobileReturn: (): Promise<{ canceled: true } | { canceled: false; filePath: string; fileName: string; inspection: MobileCompanionReturnInspectResult }> =>
      invokeIpc(IPC_CHANNELS.caseHandoverMobileReturnSelectInspect),
    importMobileReturn: (input: MobileCompanionReturnImportInput): Promise<MobileCompanionReturnImportResult> =>
      invokeIpc(IPC_CHANNELS.caseHandoverMobileReturnImport, input),
  };
}

export function createCasesApi(invokeIpc: IpcInvoker) {
  return {
  cases: {
      list: (): Promise<CaseRecord[]> => invokeIpc(IPC_CHANNELS.casesList),
      create: (input: CreateCaseInput): Promise<CaseRecord> =>
        invokeIpc(IPC_CHANNELS.casesCreate, input),
      bindLegacyCase: (input: LegacyCaseBindingInput): Promise<LegacyCaseBindingResult> =>
        invokeIpc(IPC_CHANNELS.casesBindLegacy, input),
      listNotes: (caseId: string): Promise<CaseNoteRecord[]> =>
        invokeIpc(IPC_CHANNELS.casesNotesList, caseId),
      createNote: (input: CreateCaseNoteInput): Promise<CaseNoteRecord> =>
        invokeIpc(IPC_CHANNELS.casesNotesCreate, input),
      updateNote: (
        id: string,
        input: UpdateCaseNoteInput,
      ): Promise<CaseNoteRecord> =>
        invokeIpc(IPC_CHANNELS.casesNotesUpdate, id, input),
      deleteNote: (id: string): Promise<{ deleted: boolean }> =>
        invokeIpc(IPC_CHANNELS.casesNotesDelete, id),
      listDocuments: (caseId: string, measureId?: string): Promise<CaseDocumentRecord[]> =>
        invokeIpc(IPC_CHANNELS.casesDocumentsList, caseId, measureId),
      selectAndImportDocuments: (
        caseId: string,
        containsHealthData = true,
        measureId?: string,
      ): Promise<CaseDocumentRecord[]> =>
        invokeIpc(
          IPC_CHANNELS.casesDocumentsSelectAndImport,
          caseId,
          containsHealthData,
          measureId,
        ),
      deleteDocument: (id: string): Promise<{ deleted: boolean }> =>
        invokeIpc(IPC_CHANNELS.casesDocumentsDelete, id),
      openDocument: (
        id: string,
      ): Promise<{ opened: boolean; filePath: string }> =>
        invokeIpc(IPC_CHANNELS.casesDocumentsOpen, id),
      exportDocument: (
        id: string,
        suggestedFileName?: string,
      ): Promise<{ exported: boolean; filePath: string }> =>
        invokeIpc(IPC_CHANNELS.casesDocumentsExport, id, suggestedFileName),
      search: (input: CaseContentSearchInput): Promise<CaseSearchResult[]> =>
        invokeIpc(IPC_CHANNELS.casesSearch, input),
      searchUnified: (input: UnifiedSearchQuery): Promise<UnifiedSearchPage> =>
        invokeIpc(IPC_CHANNELS.casesSearchUnified, input),
      searchDetail: (sourceType: string, sourceId: string): Promise<UnifiedSearchDetail | null> =>
        invokeIpc(IPC_CHANNELS.casesSearchDetail, { sourceType, sourceId }),
    },
  caseHandover: createCaseHandoverApi(invokeIpc),
  caseMeasures: {
      list: (caseId?: string): Promise<CaseMeasureRecord[]> =>
        invokeIpc(IPC_CHANNELS.caseMeasuresList, caseId),
      create: (input: CreateCaseMeasureInput): Promise<CaseMeasureRecord> =>
        invokeIpc(IPC_CHANNELS.caseMeasuresCreate, input),
      deleteProcess: (input: DeleteCaseProcessInput): Promise<DeleteCaseProcessResult> =>
        invokeIpc(IPC_CHANNELS.caseMeasuresDeleteProcess, input),
      update: (
        id: string,
        input: UpdateCaseMeasureInput,
      ): Promise<CaseMeasureRecord> =>
        invokeIpc(IPC_CHANNELS.caseMeasuresUpdate, id, input),
      listNotes: (
        caseId: string,
        measureType?: CaseMeasureNoteProcessType,
        measureId?: string,
      ): Promise<CaseMeasureNoteRecord[]> =>
        invokeIpc(IPC_CHANNELS.caseMeasuresNotesList, caseId, measureType, measureId),
      createNote: (input: CreateCaseMeasureNoteInput): Promise<CaseMeasureNoteRecord> =>
        invokeIpc(IPC_CHANNELS.caseMeasuresNotesCreate, input),
      updateNote: (
        id: string,
        input: UpdateCaseMeasureNoteInput,
      ): Promise<CaseMeasureNoteRecord> =>
        invokeIpc(IPC_CHANNELS.caseMeasuresNotesUpdate, id, input),
      deleteNote: (id: string): Promise<{ deleted: boolean }> =>
        invokeIpc(IPC_CHANNELS.caseMeasuresNotesDelete, id),
    },
  contacts: {
      list: (filters?: ContactListFilters): Promise<ContactRecord[]> =>
        invokeIpc(IPC_CHANNELS.contactsList, filters),
      create: (input: CreateContactInput): Promise<ContactRecord> =>
        invokeIpc(IPC_CHANNELS.contactsCreate, input),
      update: (id: string, input: UpdateContactInput): Promise<ContactRecord> =>
        invokeIpc(IPC_CHANNELS.contactsUpdate, id, input),
      delete: (id: string): Promise<DeleteContactResult> =>
        invokeIpc(IPC_CHANNELS.contactsDelete, id),
    },
  deadlines: {
      list: (filters?: DeadlineListFilters): Promise<DeadlineRecord[]> =>
        invokeIpc(IPC_CHANNELS.deadlinesList, filters),
      dashboard: (): Promise<DeadlineDashboardItem[]> =>
        invokeIpc(IPC_CHANNELS.deadlinesDashboard),
      create: (input: CreateDeadlineInput): Promise<DeadlineRecord> =>
        invokeIpc(IPC_CHANNELS.deadlinesCreate, input),
      update: (id: string, input: UpdateDeadlineInput): Promise<DeadlineRecord> =>
        invokeIpc(IPC_CHANNELS.deadlinesUpdate, id, input),
      complete: (id: string, note?: string): Promise<DeadlineRecord> =>
        invokeIpc(IPC_CHANNELS.deadlinesComplete, id, note),
      suspend: (id: string, reason: string): Promise<DeadlineRecord> =>
        invokeIpc(IPC_CHANNELS.deadlinesSuspend, id, reason),
      cancel: (id: string, reason: string): Promise<DeadlineRecord> =>
        invokeIpc(IPC_CHANNELS.deadlinesCancel, id, reason),
      exportIcal: (filters?: DeadlineListFilters, privacyLevel?: "privacy_first" | "process_type" | "case_reference" | "details"): Promise<string> =>
        invokeIpc(IPC_CHANNELS.deadlinesIcalExport, filters, privacyLevel),
    }
  } as const;
}
