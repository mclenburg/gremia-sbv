import type { IpcMain } from 'electron';
import { CaseMeasureService } from '../../services/caseMeasureService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CreateCaseMeasureInput, UpdateCaseMeasureInput } from '../../src/app/core/models/case-measure.model.js';
import { assertOptionalString, assertRecordInput, assertString } from './ipcValidation.js';

export function registerCaseMeasureIpc(ipcMain: IpcMain, security: SecurityService): void {
  const measures = () => new CaseMeasureService(security.getActiveDatabase());

  ipcMain.handle('caseMeasures:list', async (_event, caseId?: unknown) =>
    measures().list(assertOptionalString(caseId, 'caseMeasures:list', 'Fall-ID', { maxLength: 120 }))
  );

  ipcMain.handle('caseMeasures:create', async (_event, input: unknown) =>
    measures().create(assertRecordInput<CreateCaseMeasureInput>(input, 'caseMeasures:create'))
  );

  ipcMain.handle('caseMeasures:update', async (_event, id: unknown, input: unknown) =>
    measures().update(
      assertString(id, 'caseMeasures:update', 'Maßnahmen-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateCaseMeasureInput>(input, 'caseMeasures:update')
    )
  );
}
