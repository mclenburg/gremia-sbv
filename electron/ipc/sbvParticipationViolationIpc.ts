import type { IpcMain } from 'electron';
import { SbvParticipationViolationService } from '../../services/sbvParticipationViolationService.js';
import { SbvParticipationViolationDocumentService } from '../../services/sbvParticipationViolationDocumentService.js';
import { SbvParticipationViolationTemplateService } from '../../services/sbvParticipationViolationTemplateService.js';
import type { SecurityService } from '../../services/securityService.js';
import type {
  CreateSbvParticipationViolationInput,
  SbvParticipationViolationListFilter,
  SbvParticipationViolationStatusChangeInput,
  SbvParticipationViolationTemplateInput,
  UpdateSbvParticipationViolationInput,
} from '../../src/app/core/models/sbv-participation-violation.model.js';
import { assertRecordInput, assertString } from './ipcValidation.js';

export function registerSbvParticipationViolationIpc(ipcMain: IpcMain, security: SecurityService, dataDirProvider: () => string): void {
  const service = () => new SbvParticipationViolationService(security.getActiveDatabase());
  const documents = () => new SbvParticipationViolationDocumentService(security.getActiveDatabase(), dataDirProvider);
  const templates = () => new SbvParticipationViolationTemplateService();

  ipcMain.handle('sbvParticipationViolations:list', async (_event, filter?: unknown) =>
    service().list(assertRecordInput<SbvParticipationViolationListFilter>(filter ?? {}, 'sbvParticipationViolations:list'))
  );

  ipcMain.handle('sbvParticipationViolations:get', async (_event, id: unknown) =>
    service().get(assertString(id, 'sbvParticipationViolations:get', 'Verstoß-ID', { minLength: 1, maxLength: 120 }))
  );

  ipcMain.handle('sbvParticipationViolations:events:list', async (_event, id: unknown) =>
    service().listEvents(assertString(id, 'sbvParticipationViolations:events:list', 'Verstoß-ID', { minLength: 1, maxLength: 120 }))
  );

  ipcMain.handle('sbvParticipationViolations:create', async (_event, input: unknown) =>
    service().create(assertRecordInput<CreateSbvParticipationViolationInput>(input, 'sbvParticipationViolations:create'))
  );

  ipcMain.handle('sbvParticipationViolations:update', async (_event, id: unknown, input: unknown) =>
    service().update(
      assertString(id, 'sbvParticipationViolations:update', 'Verstoß-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateSbvParticipationViolationInput>(input, 'sbvParticipationViolations:update')
    )
  );

  ipcMain.handle('sbvParticipationViolations:status', async (_event, id: unknown, input: unknown) => {
    const statusInput = assertRecordInput<SbvParticipationViolationStatusChangeInput>(input, 'sbvParticipationViolations:status');
    return service().changeStatus(
      assertString(id, 'sbvParticipationViolations:status', 'Verstoß-ID', { minLength: 1, maxLength: 120 }),
      statusInput.status,
      statusInput.note,
    );
  });


  ipcMain.handle('sbvParticipationViolations:template:validate', async (_event, input: unknown) =>
    templates().validate(assertRecordInput<SbvParticipationViolationTemplateInput>(input, 'sbvParticipationViolations:template:validate'))
  );

  ipcMain.handle('sbvParticipationViolations:documents:generate', async (_event, id: unknown, options?: unknown) =>
    documents().generateDocument(
      assertString(id, 'sbvParticipationViolations:documents:generate', 'Verstoß-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<Partial<Pick<SbvParticipationViolationTemplateInput, 'recipientLabel' | 'privacyMode' | 'includeLegalReviewHint' | 'includeOwiHint'>>>(options ?? {}, 'sbvParticipationViolations:documents:generate')
    )
  );

  ipcMain.handle('sbvParticipationViolations:documents:list', async (_event, id: unknown) =>
    documents().listDocuments(assertString(id, 'sbvParticipationViolations:documents:list', 'Verstoß-ID', { minLength: 1, maxLength: 120 }))
  );

  ipcMain.handle('sbvParticipationViolations:followUp:create', async (_event, id: unknown, dueAt?: unknown) =>
    service().createFollowUp(
      assertString(id, 'sbvParticipationViolations:followUp:create', 'Verstoß-ID', { minLength: 1, maxLength: 120 }),
      dueAt === undefined ? undefined : assertString(dueAt, 'sbvParticipationViolations:followUp:create', 'Wiedervorlage', { minLength: 1, maxLength: 80 })
    )
  );

  ipcMain.handle('sbvParticipationViolations:journal:prefill', async (_event, id: unknown) =>
    service().buildJournalPrefill(assertString(id, 'sbvParticipationViolations:journal:prefill', 'Verstoß-ID', { minLength: 1, maxLength: 120 }))
  );

  ipcMain.handle('sbvParticipationViolations:delete', async (_event, id: unknown) =>
    service().delete(assertString(id, 'sbvParticipationViolations:delete', 'Verstoß-ID', { minLength: 1, maxLength: 120 }))
  );
}
