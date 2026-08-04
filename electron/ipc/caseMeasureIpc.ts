import { registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import type { CaseMeasureNoteProcessType, CreateCaseMeasureInput, CreateCaseMeasureNoteInput, UpdateCaseMeasureInput, UpdateCaseMeasureNoteInput } from '../../src/app/core/models/case-measure.model.js';
import { assertOptionalString, assertRecordInput, assertString } from './ipcValidation.js';

export function registerCaseMeasureIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  const measures = services.caseMeasures;

  registerIpcHandler(ipcMain, 'caseMeasures:list', async (_event, caseId?: unknown) =>
    measures().list(assertOptionalString(caseId, 'caseMeasures:list', 'Fall-ID', { maxLength: 120 }))
  );

  registerIpcHandler(ipcMain, 'caseMeasures:create', async (_event, input: unknown) =>
    measures().create(assertRecordInput<CreateCaseMeasureInput>(input, 'caseMeasures:create'))
  );

  registerIpcHandler(ipcMain, 'caseMeasures:update', async (_event, id: unknown, input: unknown) =>
    measures().update(
      assertString(id, 'caseMeasures:update', 'Maßnahmen-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateCaseMeasureInput>(input, 'caseMeasures:update')
    )
  );

  registerIpcHandler(ipcMain, 'caseMeasures:notes:list', async (_event, caseId: unknown, measureType?: unknown, measureId?: unknown) =>
    measures().listNotes(
      assertString(caseId, 'caseMeasures:notes:list', 'Fall-ID', { minLength: 1, maxLength: 120 }),
      measureType ? assertString(measureType, 'caseMeasures:notes:list', 'Maßnahmentyp', { minLength: 1, maxLength: 80 }) as CaseMeasureNoteProcessType : undefined,
      measureId ? assertString(measureId, 'caseMeasures:notes:list', 'Maßnahmen-ID', { minLength: 1, maxLength: 120 }) : undefined
    )
  );

  registerIpcHandler(ipcMain, 'caseMeasures:notes:create', async (_event, input: unknown) =>
    measures().createNote(assertRecordInput<CreateCaseMeasureNoteInput>(input, 'caseMeasures:notes:create'))
  );

  registerIpcHandler(ipcMain, 'caseMeasures:notes:update', async (_event, id: unknown, input: unknown) =>
    measures().updateNote(
      assertString(id, 'caseMeasures:notes:update', 'Notiz-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateCaseMeasureNoteInput>(input, 'caseMeasures:notes:update')
    )
  );

  registerIpcHandler(ipcMain, 'caseMeasures:notes:delete', async (_event, id: unknown) =>
    measures().deleteNote(assertString(id, 'caseMeasures:notes:delete', 'Notiz-ID', { minLength: 1, maxLength: 120 }))
  );
}
