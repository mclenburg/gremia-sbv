import type { IpcMain } from 'electron';
import { TemplateService } from '../../services/templateService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CreateTemplateInput, RenderContextTemplateInput, RenderTemplateInput, TemplateListFilters, UpdateTemplateInput } from '../../src/app/core/models/template.model.js';

export function registerTemplateIpc(ipcMain: IpcMain, security: SecurityService): void {
  const templates = new TemplateService(() => security.getActiveDatabase());

  ipcMain.handle('templates:list', async (_event, filters?: TemplateListFilters) => templates.listTemplates(filters));
  ipcMain.handle('templates:create', async (_event, input: CreateTemplateInput) => templates.createTemplate(input));
  ipcMain.handle('templates:update', async (_event, id: string, input: UpdateTemplateInput) => templates.updateTemplate(id, input));
  ipcMain.handle('templates:delete', async (_event, id: string) => templates.deleteTemplate(id));
  ipcMain.handle('templates:render', async (_event, input: RenderTemplateInput) => templates.renderTemplate(input));
  ipcMain.handle('templates:render-context', async (_event, input: RenderContextTemplateInput) => templates.renderContextTemplate(input));
}
