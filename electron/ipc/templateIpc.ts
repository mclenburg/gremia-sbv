import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from "electron";
import type { SecurityService } from "../../services/securityService.js";
import type { ApplicationServices } from '../applicationServices.js';
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
import { GeneratedDocumentStoreService } from '../../services/generatedDocumentStoreService.js';
import { generateAndRequestDocumentPreviewForRecord } from './documentPreviewWorkflow.js';
import { createExternalPreviewOpener } from './externalPreviewRequest.js';

export function registerTemplateIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  services: ApplicationServices,
): void {
  const pdfDocuments = new PdfDocumentGenerationService();
  const externalPreviewOpener = createExternalPreviewOpener();

  registerIpcHandler(ipcMain, IPC_CHANNELS.templateDefaultsList, async () => services.templateDefaults().list());
  registerIpcHandler(ipcMain, IPC_CHANNELS.templateDefaultsSave, async (_event, input: unknown) =>
    services.templateDefaults().save(
      assertRecordInput<Partial<TemplateDefaultValues>>(input, "template-defaults:save"),
    ),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.templatesList, async (_event, filters?: unknown) =>
    services.templates().listTemplates(
      assertOptionalObject<TemplateListFilters>(filters, "templates:list", "Filter"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.templatesCreate, async (_event, input: unknown) =>
    services.templates().createTemplate(
      assertRecordInput<CreateTemplateInput>(input, "templates:create"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.templatesUpdate, async (_event, id: unknown, input: unknown) =>
    services.templates().updateTemplate(
      assertString(id, "templates:update", "Vorlagen-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateTemplateInput>(input, "templates:update"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.templatesDelete, async (_event, id: unknown) =>
    services.templates().deleteTemplate(assertString(id, "templates:delete", "Vorlagen-ID", { minLength: 1, maxLength: 120 })),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.templatesRender, async (_event, input: unknown) =>
    services.templates().renderTemplate(
      assertRecordInput<RenderTemplateInput>(input, "templates:render"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.templatesRenderContext, async (_event, input: unknown) =>
    services.templates().renderContextTemplate(
      assertRecordInput<RenderContextTemplateInput>(input, "templates:render-context"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.templatesOpenPdf, async (_event, rawInput: unknown) => {
    const input = assertRecordInput<Record<string, unknown>>(rawInput, 'templates:open-pdf');
    const generatedDocuments = new GeneratedDocumentStoreService(security.getActiveDatabase(), security.getDataDirectory());
    const title = assertString(input.title, 'templates:open-pdf', 'Dokumenttitel', { minLength: 1, maxLength: 300 });
    const subject = assertString(input.subject, 'templates:open-pdf', 'Betreff', { minLength: 1, maxLength: 2_000 });
    const body = assertString(input.body, 'templates:open-pdf', 'Dokumenttext', { minLength: 1, maxLength: 500_000 });
    const result = await generateAndRequestDocumentPreviewForRecord({
      operation: 'templates:open-pdf',
      generateFailureMessage: 'Das PDF aus der Vorlage konnte nicht erzeugt oder verschlüsselt gespeichert werden.',
      security,
      opener: externalPreviewOpener,
      getDocumentId: (record) => record.id,
      getFilename: (record) => record.filename,
      read: (documentId) => generatedDocuments.read(documentId),
      generate: async () => {
        let pdf: Buffer | undefined;
        try {
          pdf = await pdfDocuments.generate({
            source: 'template',
            privacyProfile: 'lawful_personal_data',
            definition: externalLetterDocument({
              title,
              sender: sbvSenderLines(services.templateDefaults().list()),
              recipient: [],
              date: new Intl.DateTimeFormat('de-DE').format(new Date()),
              subject,
              blocks: body.split(/\n\s*\n/u).map((text) => paragraph(text)),
            }),
          });
          return generatedDocuments.store({
            source: 'template',
            title,
            filename: `${safeDocumentFilePart(title)}.pdf`,
            mimeType: 'application/pdf',
            plain: pdf,
          });
        } finally {
          pdf?.fill(0);
        }
      },
    });
    return {
      opened: result.previewStatus === 'requested',
      document: result.record,
      previewStatus: result.previewStatus,
      ...(result.previewMessage ? { previewMessage: result.previewMessage } : {}),
    };
  });
}
