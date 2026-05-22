import type { IpcMain } from "electron";
import { TemplateService } from "../../services/templateService.js";
import { TemplateDefaultService } from "../../services/templateDefaultService.js";
import type { SecurityService } from "../../services/securityService.js";
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
): void {
  const templates = new TemplateService(() => security.getActiveDatabase());
  const templateDefaults = new TemplateDefaultService(() => security.getActiveDatabase());
  registerGremiaBrIpc(ipcMain, security);


  ipcMain.handle("template-defaults:list", async () => templateDefaults.list());
  ipcMain.handle("template-defaults:save", async (_event, input: unknown) =>
    templateDefaults.save(
      assertRecordInput<Partial<TemplateDefaultValues>>(input, "template-defaults:save"),
    ),
  );

  ipcMain.handle("templates:list", async (_event, filters?: unknown) =>
    templates.listTemplates(
      assertOptionalObject<TemplateListFilters>(filters, "templates:list", "Filter"),
    ),
  );
  ipcMain.handle("templates:create", async (_event, input: unknown) =>
    templates.createTemplate(
      assertRecordInput<CreateTemplateInput>(input, "templates:create"),
    ),
  );
  ipcMain.handle("templates:update", async (_event, id: unknown, input: unknown) =>
    templates.updateTemplate(
      assertString(id, "templates:update", "Vorlagen-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateTemplateInput>(input, "templates:update"),
    ),
  );
  ipcMain.handle("templates:delete", async (_event, id: unknown) =>
    templates.deleteTemplate(assertString(id, "templates:delete", "Vorlagen-ID", { minLength: 1, maxLength: 120 })),
  );
  ipcMain.handle("templates:render", async (_event, input: unknown) =>
    templates.renderTemplate(
      assertRecordInput<RenderTemplateInput>(input, "templates:render"),
    ),
  );
  ipcMain.handle("templates:render-context", async (_event, input: unknown) =>
    templates.renderContextTemplate(
      assertRecordInput<RenderContextTemplateInput>(input, "templates:render-context"),
    ),
  );
}
