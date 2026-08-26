import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { shell, type IpcMain } from "electron";
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
import { externalLetterDocument, paragraph } from '../../services/documents/pdfDocumentDefinition.js';
import { PdfDocumentGenerationService } from '../../services/documents/pdfDocumentGenerationService.js';
import { sbvSenderLines } from '../../services/documents/documentIdentityPolicy.js';
import { safeDocumentFilePart } from '../../services/documentContainerService.js';
import { requestExternalPreview } from './externalPreviewRequest.js';

export function registerTemplateIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  services: ApplicationServices,
): void {
  const templates = services.templates;
  const templateDefaults = services.templateDefaults;
  const pdfDocuments = new PdfDocumentGenerationService();
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
  registerIpcHandler(ipcMain, IPC_CHANNELS.templatesOpenPdf, async (_event, rawInput: unknown) => {
    const input = assertRecordInput<Record<string, unknown>>(rawInput, 'templates:open-pdf');
    const title = assertString(input.title, 'templates:open-pdf', 'Dokumenttitel', { minLength: 1, maxLength: 300 });
    const subject = assertString(input.subject, 'templates:open-pdf', 'Betreff', { minLength: 1, maxLength: 2_000 });
    const body = assertString(input.body, 'templates:open-pdf', 'Dokumenttext', { minLength: 1, maxLength: 500_000 });
    let pdf: Buffer | undefined;
    try {
      pdf = await pdfDocuments.generate({
        source: 'template',
        privacyProfile: 'lawful_personal_data',
        definition: externalLetterDocument({
          title,
          sender: sbvSenderLines(templateDefaults.list()),
          recipient: [],
          date: new Intl.DateTimeFormat('de-DE').format(new Date()),
          subject,
          blocks: body.split(/\n\s*\n/u).map((text) => paragraph(text)),
        }),
      });
      security.cleanupTemporaryFiles();
      const filePath = security.writeTemporaryFile('document-preview', `${safeDocumentFilePart(title)}.pdf`, pdf, 'preview');
      requestExternalPreview(filePath, (previewPath) => shell.openPath(previewPath));
      return { opened: true };
    } finally {
      pdf?.fill(0);
    }
  });
}
