import type { IpcMain } from 'electron';
import { KnowledgeService } from '../../services/knowledgeService.js';
import type { SecurityService } from '../../services/securityService.js';
import type {
  CreateCaseLawInput,
  CreateLegalNormInput,
  CreateNormChecklistItemInput,
  CreateNormCommentInput,
  LegalNormSearchInput,
  LinkLegalNormToCaseInput,
  UpdateLegalNormInput
} from '../../src/app/core/models/knowledge.model.js';

export function registerKnowledgeIpc(ipcMain: IpcMain, security: SecurityService): void {
  const knowledge = new KnowledgeService(() => security.getActiveDatabase());

  ipcMain.handle('knowledge:norms:list', async (_event, filters?: LegalNormSearchInput) => knowledge.listNorms(filters));
  ipcMain.handle('knowledge:norms:get', async (_event, id: string) => knowledge.getNorm(id));
  ipcMain.handle('knowledge:norms:create', async (_event, input: CreateLegalNormInput) => knowledge.createNorm(input));
  ipcMain.handle('knowledge:norms:update', async (_event, id: string, input: UpdateLegalNormInput) => knowledge.updateNorm(id, input));
  ipcMain.handle('knowledge:cases:link', async (_event, input: LinkLegalNormToCaseInput) => knowledge.linkNormToCase(input));
  ipcMain.handle('knowledge:cases:list', async (_event, caseId: string) => knowledge.listCaseReferences(caseId));
  ipcMain.handle('knowledge:cases:unlink', async (_event, caseId: string, legalNormId: string) => knowledge.unlinkNormFromCase(caseId, legalNormId));
  ipcMain.handle('knowledge:comments:list', async (_event, legalNormId: string) => knowledge.listComments(legalNormId));
  ipcMain.handle('knowledge:comments:create', async (_event, input: CreateNormCommentInput) => knowledge.createComment(input));
  ipcMain.handle('knowledge:caselaw:list', async (_event, legalNormId: string) => knowledge.listCaseLaw(legalNormId));
  ipcMain.handle('knowledge:caselaw:create', async (_event, input: CreateCaseLawInput) => knowledge.createCaseLaw(input));
  ipcMain.handle('knowledge:checklist:list', async (_event, legalNormId: string) => knowledge.listChecklist(legalNormId));
  ipcMain.handle('knowledge:checklist:create', async (_event, input: CreateNormChecklistItemInput) => knowledge.createChecklistItem(input));
  ipcMain.handle('knowledge:export:preview', async () => knowledge.exportPreview());
}
