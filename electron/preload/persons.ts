import type { IpcInvoker } from "./invoke.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
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
} from "../../src/app/core/models/protected-person.model.js";

export function createPersonsApi(invokeIpc: IpcInvoker) {
  return {
  persons: {
      list: (filters?: ProtectedPersonListFilters): Promise<ProtectedPersonRecord[]> =>
        invokeIpc(IPC_CHANNELS.personsList, filters),
      create: (input: CreateProtectedPersonInput): Promise<ProtectedPersonRecord> =>
        invokeIpc(IPC_CHANNELS.personsCreate, input),
      createAnonymousRequest: (label?: string): Promise<ProtectedPersonRecord> =>
        invokeIpc(IPC_CHANNELS.personsCreateAnonymousRequest, label),
      update: (id: string, input: UpdateProtectedPersonInput): Promise<ProtectedPersonRecord> =>
        invokeIpc(IPC_CHANNELS.personsUpdate, id, input),
      linkCase: (personId: string, caseId: string, reason?: string): Promise<PersonCaseLinkRecord> =>
        invokeIpc(IPC_CHANNELS.personsLinkCase, personId, caseId, reason),
      previewImport: (input: PersonImportPreviewInput): Promise<PersonImportPreviewResult> =>
        invokeIpc(IPC_CHANNELS.personsImportPreview, input),
      executeImport: (input: PersonImportExecuteInput): Promise<PersonImportExecuteResult> =>
        invokeIpc(IPC_CHANNELS.personsImportExecute, input),
      selectImportFile: (): Promise<{ filePath: string; sourceFileName: string; fileType: 'csv' | 'xlsx' } | null> =>
        invokeIpc(IPC_CHANNELS.personsImportSelectPreview),
      evaluateExpiry: (referenceIso?: string): Promise<PersonStatusExpirySummary> =>
        invokeIpc(IPC_CHANNELS.personsExpiryEvaluate, referenceIso),
      anonymize: (id: string, reason: string): Promise<PersonAnonymizationResult> =>
        invokeIpc(IPC_CHANNELS.personsAnonymize, id, reason),
      delete: (id: string, reason: string): Promise<{ ok: true; affectedCaseIds: string[]; deletedPersonId: string }> =>
        invokeIpc(IPC_CHANNELS.personsDelete, id, reason),
    }
  } as const;
}
