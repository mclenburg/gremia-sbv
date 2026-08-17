import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from "electron";
import type { SecurityService } from "../../services/securityService.js";
import type { ApplicationServices } from '../applicationServices.js';
import { registerGremiaBrIpc } from "./gremiaBrIpc.js";
import type {
  CreateTemplateInput,
  RenderContextTemplateInput,
  RenderTemplateInput,
  TemplateListFilters,
  UpdateTemplateInput,
} from "../../src/domain/models/template.model.js";
import type { TemplateDefaultValues } from "../../src/domain/models/template-default.model.js";
import {
  assertOptionalObject,
  assertRecordInput,
  assertString,
} from "./ipcValidation.js";

export function registerTemplateIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  services: ApplicationServices,
): void {
  const templates = services.templates;
  const templateDefaults = services.templateDefaults;
  registerGremiaBrIpc(ipcMain, security, services);


  registerIpcHandler(ipcMain, IPC_CHANNELS.templateDefaultsList, async () => templateDefaults.list());
  registerIpcHandler(ipcMain, IPC_CHANNELS.templateDefaultsSave, async (_event, input: unknown) =>
    templateDefaults.save(
      assertRecordInput<Partial<TemplateDefaultValues>>(input, "template-defaults:save"),
    ),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.templatesList, async (_event, filters?: unknown) =>
    templates.listTemplates(
      assertOptionalObject<TemplateListFilters>(filters, "templates:list", "Filter"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.templatesCreate, async (_event, input: unknown) =>
    templates.createTemplate(
      assertRecordInput<CreateTemplateInput>(input, "templates:create"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.templatesUpdate, async (_event, id: unknown, input: unknown) =>
    templates.updateTemplate(
      assertString(id, "templates:update", "Vorlagen-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateTemplateInput>(input, "templates:update"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.templatesDelete, async (_event, id: unknown) =>
    templates.deleteTemplate(assertString(id, "templates:delete", "Vorlagen-ID", { minLength: 1, maxLength: 120 })),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.templatesRender, async (_event, input: unknown) =>
    templates.renderTemplate(
      assertRecordInput<RenderTemplateInput>(input, "templates:render"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.templatesRenderContext, async (_event, input: unknown) =>
    templates.renderContextTemplate(
      assertRecordInput<RenderContextTemplateInput>(input, "templates:render-context"),
    ),
  );
}
