import type { IpcInvoker } from "./invoke.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
import type {
  CaseRecord,
  CreateCaseInput,
  LegacyCaseBindingInput,
  LegacyCaseBindingResult,
} from "../../src/app/core/models/case.model.js";
import type {
  CaseContentSearchInput,
  CaseNoteRecord,
  CaseSearchResult,
  CreateCaseNoteInput,
  UpdateCaseNoteInput,
} from "../../src/app/core/models/case-note.model.js";
import type { CaseDocumentRecord } from "../../src/app/core/models/case-document.model.js";
import type { CaseHandoverContinueExpiredResult, CaseHandoverExportInput, CaseHandoverExportResult, CaseHandoverImportInput, CaseHandoverImportResult, CaseHandoverInspectResult } from "../../src/app/core/models/case-handover.model.js";
import type {
  CaseMeasureNoteProcessType,
  CaseMeasureNoteRecord,
  CaseMeasureRecord,
  CreateCaseMeasureInput,
  CreateCaseMeasureNoteInput,
  UpdateCaseMeasureInput,
  UpdateCaseMeasureNoteInput,
} from "../../src/app/core/models/case-measure.model.js";
import type {
  ContactListFilters,
  ContactRecord,
  CreateContactInput,
  DeleteContactResult,
  UpdateContactInput,
} from "../../src/app/core/models/contact.model.js";
import type {
  CreateDeadlineInput,
  DeadlineDashboardItem,
  DeadlineListFilters,
  DeadlineRecord,
  UpdateDeadlineInput,
} from "../../src/app/core/models/deadline.model.js";

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
    },
  caseHandover: {
      export: (input: CaseHandoverExportInput, suggestedFileName?: string): Promise<CaseHandoverExportResult> =>
        invokeIpc(IPC_CHANNELS.caseHandoverExport, input, suggestedFileName),
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
    },
  caseMeasures: {
      list: (caseId?: string): Promise<CaseMeasureRecord[]> =>
        invokeIpc(IPC_CHANNELS.caseMeasuresList, caseId),
      create: (input: CreateCaseMeasureInput): Promise<CaseMeasureRecord> =>
        invokeIpc(IPC_CHANNELS.caseMeasuresCreate, input),
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
