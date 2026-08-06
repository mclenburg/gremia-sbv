import type { IpcInvoker } from "./invoke.js";
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
} from "../../src/app/core/models/knowledge.model.js";
import { IPC_CHANNELS } from "../ipc/channels.js";

export function createKnowledgeApi(invokeIpc: IpcInvoker) {
  return {
  knowledge: {
          listNorms: (filters?: LegalNormSearchInput): Promise<LegalNormRecord[]> =>
            invokeIpc(IPC_CHANNELS.knowledgeNormsList, filters),
          getNorm: (id: string): Promise<LegalNormRecord | null> =>
            invokeIpc(IPC_CHANNELS.knowledgeNormsGet, id),
          createNorm: (input: CreateLegalNormInput): Promise<LegalNormRecord> =>
            invokeIpc(IPC_CHANNELS.knowledgeNormsCreate, input),
          updateNorm: (
            id: string,
            input: UpdateLegalNormInput,
          ): Promise<LegalNormRecord> =>
            invokeIpc(IPC_CHANNELS.knowledgeNormsUpdate, id, input),
          linkNormToCase: (
            input: LinkLegalNormToCaseInput,
          ): Promise<CaseLegalReferenceRecord> =>
            invokeIpc(IPC_CHANNELS.knowledgeCasesLink, input),
          listCaseReferences: (caseId: string): Promise<CaseLegalReferenceRecord[]> =>
            invokeIpc(IPC_CHANNELS.knowledgeCasesList, caseId),
          unlinkNormFromCase: (
            caseId: string,
            legalNormId: string,
          ): Promise<{ deleted: boolean }> =>
            invokeIpc(IPC_CHANNELS.knowledgeCasesUnlink, caseId, legalNormId),
          listComments: (legalNormId: string): Promise<NormCommentRecord[]> =>
            invokeIpc(IPC_CHANNELS.knowledgeCommentsList, legalNormId),
          createComment: (
            input: CreateNormCommentInput,
          ): Promise<NormCommentRecord> =>
            invokeIpc(IPC_CHANNELS.knowledgeCommentsCreate, input),
          listCaseLaw: (legalNormId: string): Promise<CaseLawRecord[]> =>
            invokeIpc(IPC_CHANNELS.knowledgeCaselawList, legalNormId),
          createCaseLaw: (input: CreateCaseLawInput): Promise<CaseLawRecord> =>
            invokeIpc(IPC_CHANNELS.knowledgeCaselawCreate, input),
          listChecklist: (legalNormId: string): Promise<NormChecklistItemRecord[]> =>
            invokeIpc(IPC_CHANNELS.knowledgeChecklistList, legalNormId),
          createChecklistItem: (
            input: CreateNormChecklistItemInput,
          ): Promise<NormChecklistItemRecord> =>
            invokeIpc(IPC_CHANNELS.knowledgeChecklistCreate, input),
          exportPreview: (): Promise<KnowledgeExportPreview> =>
            invokeIpc(IPC_CHANNELS.knowledgeExportPreview),
        }
  } as const;
}
