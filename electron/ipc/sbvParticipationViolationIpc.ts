import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { shell, type IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import type {
  CreateSbvParticipationViolationInput,
  SbvParticipationViolationListFilter,
  SbvParticipationViolationStatusChangeInput,
  SbvParticipationViolationTemplateInput,
  UpdateSbvParticipationViolationInput,
} from '../../src/domain/models/sbv-participation-violation.model.js';
import { assertRecordInput, assertString } from './ipcValidation.js';
import type { ExternalPreviewOpener } from './externalPreviewRequest.js';
import { generateAndRequestDocumentPreviewForRecord } from './documentPreviewWorkflow.js';

const externalPreviewOpener: ExternalPreviewOpener = process.env.GREMIA_SBV_E2E === '1'
  ? async () => ''
  : (previewPath) => shell.openPath(previewPath);

export function registerSbvParticipationViolationIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  dataDirProvider: () => string,
  services: ApplicationServices,
): void {
  const service = services.sbvParticipationViolations;
  const documents = services.sbvParticipationViolationDocuments;
  const templates = () => services.participationViolationTemplates;

  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvParticipationViolationsList, async (_event, filter?: unknown) =>
    service().list(assertRecordInput<SbvParticipationViolationListFilter>(filter ?? {}, 'sbvParticipationViolations:list'))
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvParticipationViolationsGet, async (_event, id: unknown) =>
    service().get(assertString(id, 'sbvParticipationViolations:get', 'Verstoß-ID', { minLength: 1, maxLength: 120 }))
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvParticipationViolationsEventsList, async (_event, id: unknown) =>
    service().listEvents(assertString(id, 'sbvParticipationViolations:events:list', 'Verstoß-ID', { minLength: 1, maxLength: 120 }))
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvParticipationViolationsCreate, async (_event, input: unknown) =>
    service().create(assertRecordInput<CreateSbvParticipationViolationInput>(input, 'sbvParticipationViolations:create'))
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvParticipationViolationsUpdate, async (_event, id: unknown, input: unknown) =>
    service().update(
      assertString(id, 'sbvParticipationViolations:update', 'Verstoß-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateSbvParticipationViolationInput>(input, 'sbvParticipationViolations:update')
    )
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvParticipationViolationsStatus, async (_event, id: unknown, input: unknown) => {
    const statusInput = assertRecordInput<SbvParticipationViolationStatusChangeInput>(input, 'sbvParticipationViolations:status');
    return service().changeStatus(
      assertString(id, 'sbvParticipationViolations:status', 'Verstoß-ID', { minLength: 1, maxLength: 120 }),
      statusInput.status,
      statusInput.note,
    );
  });


  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvParticipationViolationsTemplateValidate, async (_event, input: unknown) =>
    templates().validate(assertRecordInput<SbvParticipationViolationTemplateInput>(input, 'sbvParticipationViolations:template:validate'))
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvParticipationViolationsDocumentsGenerate, async (_event, id: unknown, options?: unknown) => {
    const operation = 'sbvParticipationViolations:documents:generate';
    const documentService = documents();
    const violationId = assertString(id, operation, 'Verstoß-ID', { minLength: 1, maxLength: 120 });
    const input = assertRecordInput<Partial<Pick<SbvParticipationViolationTemplateInput, 'recipientLabel' | 'privacyMode' | 'includeLegalReviewHint' | 'includeOwiHint'>>>(options ?? {}, operation);
    const result = await generateAndRequestDocumentPreviewForRecord({
      operation,
      generateFailureMessage: 'Das PDF-Dokument zum Beteiligungsverstoß konnte nicht erzeugt oder verschlüsselt gespeichert werden.',
      security,
      opener: externalPreviewOpener,
      generate: () => documentService.generateDocument(violationId, input),
      read: (documentId) => documentService.readDocument(documentId),
      getDocumentId: (record) => record.documentId,
      getFilename: (record) => record.filename,
    });
    return {
      ...result.record,
      previewStatus: result.previewStatus,
      ...(result.previewMessage ? { previewMessage: result.previewMessage } : {}),
    };
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvParticipationViolationsDocumentsList, async (_event, id: unknown) =>
    documents().listDocuments(assertString(id, 'sbvParticipationViolations:documents:list', 'Verstoß-ID', { minLength: 1, maxLength: 120 }))
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvParticipationViolationsFollowUpCreate, async (_event, id: unknown, dueAt?: unknown) =>
    service().createFollowUp(
      assertString(id, 'sbvParticipationViolations:followUp:create', 'Verstoß-ID', { minLength: 1, maxLength: 120 }),
      dueAt === undefined ? undefined : assertString(dueAt, 'sbvParticipationViolations:followUp:create', 'Wiedervorlage', { minLength: 1, maxLength: 80 })
    )
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvParticipationViolationsJournalPrefill, async (_event, id: unknown) =>
    service().buildJournalPrefill(assertString(id, 'sbvParticipationViolations:journal:prefill', 'Verstoß-ID', { minLength: 1, maxLength: 120 }))
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvParticipationViolationsDelete, async (_event, id: unknown) =>
    service().delete(assertString(id, 'sbvParticipationViolations:delete', 'Verstoß-ID', { minLength: 1, maxLength: 120 }))
  );
}
