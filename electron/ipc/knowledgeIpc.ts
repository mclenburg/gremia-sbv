import type { IpcMain } from "electron";
import { KnowledgeService } from "../../services/knowledgeService.js";
import type { SecurityService } from "../../services/securityService.js";
import type {
  CreateCaseLawInput,
  CreateLegalNormInput,
  CreateNormChecklistItemInput,
  CreateNormCommentInput,
  LegalNormSearchInput,
  LinkLegalNormToCaseInput,
  UpdateLegalNormInput,
} from "../../src/app/core/models/knowledge.model.js";
import {
  assertOptionalObject,
  assertRecordInput,
  assertString,
} from "./ipcValidation.js";

export function registerKnowledgeIpc(
  ipcMain: IpcMain,
  security: SecurityService,
): void {
  const knowledge = new KnowledgeService(() => security.getActiveDatabase());

  ipcMain.handle("knowledge:norms:list", async (_event, filters?: unknown) =>
    knowledge.listNorms(
      assertOptionalObject<LegalNormSearchInput>(filters, "knowledge:norms:list", "Filter"),
    ),
  );
  ipcMain.handle("knowledge:norms:get", async (_event, id: unknown) =>
    knowledge.getNorm(assertString(id, "knowledge:norms:get", "Norm-ID", { minLength: 1, maxLength: 120 })),
  );
  ipcMain.handle("knowledge:norms:create", async (_event, input: unknown) =>
    knowledge.createNorm(
      assertRecordInput<CreateLegalNormInput>(input, "knowledge:norms:create"),
    ),
  );
  ipcMain.handle("knowledge:norms:update", async (_event, id: unknown, input: unknown) =>
    knowledge.updateNorm(
      assertString(id, "knowledge:norms:update", "Norm-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateLegalNormInput>(input, "knowledge:norms:update"),
    ),
  );
  ipcMain.handle("knowledge:cases:link", async (_event, input: unknown) =>
    knowledge.linkNormToCase(
      assertRecordInput<LinkLegalNormToCaseInput>(input, "knowledge:cases:link"),
    ),
  );
  ipcMain.handle("knowledge:cases:list", async (_event, caseId: unknown) =>
    knowledge.listCaseReferences(
      assertString(caseId, "knowledge:cases:list", "Fall-ID", { minLength: 1, maxLength: 120 }),
    ),
  );
  ipcMain.handle(
    "knowledge:cases:unlink",
    async (_event, caseId: unknown, legalNormId: unknown) =>
      knowledge.unlinkNormFromCase(
        assertString(caseId, "knowledge:cases:unlink", "Fall-ID", { minLength: 1, maxLength: 120 }),
        assertString(legalNormId, "knowledge:cases:unlink", "Norm-ID", { minLength: 1, maxLength: 120 }),
      ),
  );
  ipcMain.handle("knowledge:comments:list", async (_event, legalNormId: unknown) =>
    knowledge.listComments(
      assertString(legalNormId, "knowledge:comments:list", "Norm-ID", { minLength: 1, maxLength: 120 }),
    ),
  );
  ipcMain.handle("knowledge:comments:create", async (_event, input: unknown) =>
    knowledge.createComment(
      assertRecordInput<CreateNormCommentInput>(input, "knowledge:comments:create"),
    ),
  );
  ipcMain.handle("knowledge:caselaw:list", async (_event, legalNormId: unknown) =>
    knowledge.listCaseLaw(
      assertString(legalNormId, "knowledge:caselaw:list", "Norm-ID", { minLength: 1, maxLength: 120 }),
    ),
  );
  ipcMain.handle("knowledge:caselaw:create", async (_event, input: unknown) =>
    knowledge.createCaseLaw(
      assertRecordInput<CreateCaseLawInput>(input, "knowledge:caselaw:create"),
    ),
  );
  ipcMain.handle("knowledge:checklist:list", async (_event, legalNormId: unknown) =>
    knowledge.listChecklist(
      assertString(legalNormId, "knowledge:checklist:list", "Norm-ID", { minLength: 1, maxLength: 120 }),
    ),
  );
  ipcMain.handle("knowledge:checklist:create", async (_event, input: unknown) =>
    knowledge.createChecklistItem(
      assertRecordInput<CreateNormChecklistItemInput>(input, "knowledge:checklist:create"),
    ),
  );
  ipcMain.handle("knowledge:export:preview", async () => knowledge.exportPreview());
}
