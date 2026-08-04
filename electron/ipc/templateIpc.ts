import { registerIpcHandler } from './ipcHandler.js';
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
} from "../../src/app/core/models/template.model.js";
import type { TemplateDefaultValues } from "../../src/app/core/models/template-default.model.js";
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


  registerIpcHandler(ipcMain, "template-defaults:list", async () => templateDefaults.list());
  registerIpcHandler(ipcMain, "template-defaults:save", async (_event, input: unknown) =>
    templateDefaults.save(
      assertRecordInput<Partial<TemplateDefaultValues>>(input, "template-defaults:save"),
    ),
  );

  registerIpcHandler(ipcMain, "templates:list", async (_event, filters?: unknown) =>
    templates.listTemplates(
      assertOptionalObject<TemplateListFilters>(filters, "templates:list", "Filter"),
    ),
  );
  registerIpcHandler(ipcMain, "templates:create", async (_event, input: unknown) =>
    templates.createTemplate(
      assertRecordInput<CreateTemplateInput>(input, "templates:create"),
    ),
  );
  registerIpcHandler(ipcMain, "templates:update", async (_event, id: unknown, input: unknown) =>
    templates.updateTemplate(
      assertString(id, "templates:update", "Vorlagen-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateTemplateInput>(input, "templates:update"),
    ),
  );
  registerIpcHandler(ipcMain, "templates:delete", async (_event, id: unknown) =>
    templates.deleteTemplate(assertString(id, "templates:delete", "Vorlagen-ID", { minLength: 1, maxLength: 120 })),
  );
  registerIpcHandler(ipcMain, "templates:render", async (_event, input: unknown) =>
    templates.renderTemplate(
      assertRecordInput<RenderTemplateInput>(input, "templates:render"),
    ),
  );
  registerIpcHandler(ipcMain, "templates:render-context", async (_event, input: unknown) =>
    templates.renderContextTemplate(
      assertRecordInput<RenderContextTemplateInput>(input, "templates:render-context"),
    ),
  );
}
