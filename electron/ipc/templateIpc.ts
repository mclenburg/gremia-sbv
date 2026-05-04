import type { IpcMain } from "electron";
import { TemplateService } from "../../services/templateService.js";
import type { SecurityService } from "../../services/securityService.js";
import type {
  CreateTemplateInput,
  RenderContextTemplateInput,
  RenderTemplateInput,
  TemplateListFilters,
  UpdateTemplateInput,
} from "../../src/app/core/models/template.model.js";
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
