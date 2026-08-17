import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from "electron";
import type { SecurityService } from "../../services/securityService.js";
import type { ApplicationServices } from '../applicationServices.js';
import type {
  CreateCaseLawInput,
  CreateLegalNormInput,
  CreateNormChecklistItemInput,
  CreateNormCommentInput,
  LegalNormSearchInput,
  LinkLegalNormToCaseInput,
  UpdateLegalNormInput,
} from "../../src/domain/models/knowledge.model.js";
import {
  assertOptionalObject,
  assertRecordInput,
  assertString,
} from "./ipcValidation.js";

export function registerKnowledgeIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  services: ApplicationServices,
): void {
  const knowledge = services.knowledge;

  registerIpcHandler(ipcMain, IPC_CHANNELS.knowledgeNormsList, async (_event, filters?: unknown) =>
    knowledge.listNorms(
      assertOptionalObject<LegalNormSearchInput>(filters, "knowledge:norms:list", "Filter"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.knowledgeNormsGet, async (_event, id: unknown) =>
    knowledge.getNorm(assertString(id, "knowledge:norms:get", "Norm-ID", { minLength: 1, maxLength: 120 })),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.knowledgeNormsCreate, async (_event, input: unknown) =>
    knowledge.createNorm(
      assertRecordInput<CreateLegalNormInput>(input, "knowledge:norms:create"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.knowledgeNormsUpdate, async (_event, id: unknown, input: unknown) =>
    knowledge.updateNorm(
      assertString(id, "knowledge:norms:update", "Norm-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateLegalNormInput>(input, "knowledge:norms:update"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.knowledgeCasesLink, async (_event, input: unknown) =>
    knowledge.linkNormToCase(
      assertRecordInput<LinkLegalNormToCaseInput>(input, "knowledge:cases:link"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.knowledgeCasesList, async (_event, caseId: unknown) =>
    knowledge.listCaseReferences(
      assertString(caseId, "knowledge:cases:list", "Fall-ID", { minLength: 1, maxLength: 120 }),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.knowledgeCasesUnlink,
    async (_event, caseId: unknown, legalNormId: unknown) =>
      knowledge.unlinkNormFromCase(
        assertString(caseId, "knowledge:cases:unlink", "Fall-ID", { minLength: 1, maxLength: 120 }),
        assertString(legalNormId, "knowledge:cases:unlink", "Norm-ID", { minLength: 1, maxLength: 120 }),
      ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.knowledgeCommentsList, async (_event, legalNormId: unknown) =>
    knowledge.listComments(
      assertString(legalNormId, "knowledge:comments:list", "Norm-ID", { minLength: 1, maxLength: 120 }),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.knowledgeCommentsCreate, async (_event, input: unknown) =>
    knowledge.createComment(
      assertRecordInput<CreateNormCommentInput>(input, "knowledge:comments:create"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.knowledgeCaselawList, async (_event, legalNormId: unknown) =>
    knowledge.listCaseLaw(
      assertString(legalNormId, "knowledge:caselaw:list", "Norm-ID", { minLength: 1, maxLength: 120 }),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.knowledgeCaselawCreate, async (_event, input: unknown) =>
    knowledge.createCaseLaw(
      assertRecordInput<CreateCaseLawInput>(input, "knowledge:caselaw:create"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.knowledgeChecklistList, async (_event, legalNormId: unknown) =>
    knowledge.listChecklist(
      assertString(legalNormId, "knowledge:checklist:list", "Norm-ID", { minLength: 1, maxLength: 120 }),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.knowledgeChecklistCreate, async (_event, input: unknown) =>
    knowledge.createChecklistItem(
      assertRecordInput<CreateNormChecklistItemInput>(input, "knowledge:checklist:create"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.knowledgeExportPreview, async () => knowledge.exportPreview());
}
