import type { IpcMain } from 'electron';
import { dialog } from 'electron';
import { ProtectedPersonService } from '../../services/protectedPersonService.js';
import { PersonImportService } from '../../services/personImportService.js';
import { PersonStatusExpiryService } from '../../services/personStatusExpiryService.js';
import { PersonAnonymizationService } from '../../services/personAnonymizationService.js';
import { exportDeadlinesToIcal, type DeadlineIcalPrivacyLevel } from '../../services/deadlineIcalExportService.js';
import { DeadlineService } from '../../services/deadlineService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CreateProtectedPersonInput, PersonImportExecuteInput, PersonImportPreviewInput, ProtectedPersonListFilters, UpdateProtectedPersonInput } from '../../src/app/core/models/protected-person.model.js';
import type { DeadlineListFilters } from '../../src/app/core/models/deadline.model.js';
import { assertOptionalObject, assertRecordInput, assertString } from './ipcValidation.js';

export function registerProtectedPersonIpc(ipcMain: IpcMain, security: SecurityService): void {
  const persons = () => new ProtectedPersonService(security.getActiveDatabase());
  const imports = () => new PersonImportService(security.getActiveDatabase());
  const expiry = () => new PersonStatusExpiryService(security.getActiveDatabase());
  const anonymization = () => new PersonAnonymizationService(security.getActiveDatabase());
  const deadlines = () => new DeadlineService(security.getActiveDatabase());

  ipcMain.handle('persons:list', async (_event, filters?: unknown) =>
    persons().list(assertOptionalObject<ProtectedPersonListFilters>(filters, 'persons:list', 'Filter') ?? {}),
  );

  ipcMain.handle('persons:create', async (_event, input: unknown) =>
    persons().create(assertRecordInput<CreateProtectedPersonInput>(input, 'persons:create')),
  );

  ipcMain.handle('persons:update', async (_event, id: unknown, input: unknown) =>
    persons().update(
      assertString(id, 'persons:update', 'Person-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateProtectedPersonInput>(input, 'persons:update'),
    ),
  );

  ipcMain.handle('persons:link-case', async (_event, personId: unknown, caseId: unknown, reason?: unknown) =>
    persons().linkCase(
      assertString(personId, 'persons:link-case', 'Person-ID', { minLength: 1, maxLength: 120 }),
      assertString(caseId, 'persons:link-case', 'Fall-ID', { minLength: 1, maxLength: 120 }),
      typeof reason === 'string' ? reason : undefined,
    ),
  );

  ipcMain.handle('persons:import:preview', async (_event, input: unknown) =>
    imports().preview(assertRecordInput<PersonImportPreviewInput>(input, 'persons:import:preview')),
  );

  ipcMain.handle('persons:import:execute', async (_event, input: unknown) =>
    imports().execute(assertRecordInput<PersonImportExecuteInput>(input, 'persons:import:execute')),
  );

  ipcMain.handle('persons:import:select-preview', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Arbeitgeberliste importieren',
      properties: ['openFile'],
      filters: [
        { name: 'Tabellen', extensions: ['csv', 'xlsx'] },
        { name: 'CSV', extensions: ['csv'] },
        { name: 'Excel', extensions: ['xlsx'] }
      ]
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const filePath = result.filePaths[0];
    const fileType = filePath.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'csv';
    return { filePath, sourceFileName: filePath.split(/[\\/]/).pop() ?? 'Arbeitgeberliste', fileType };
  });

  ipcMain.handle('persons:expiry:evaluate', async (_event, referenceIso?: unknown) =>
    expiry().evaluate(typeof referenceIso === 'string' ? new Date(referenceIso) : new Date()),
  );

  ipcMain.handle('persons:anonymize', async (_event, id: unknown, reason: unknown) =>
    anonymization().anonymizeStructuredPersonData(
      assertString(id, 'persons:anonymize', 'Person-ID', { minLength: 1, maxLength: 120 }),
      assertString(reason, 'persons:anonymize', 'Grund', { minLength: 3, maxLength: 5_000 }),
    ),
  );

  ipcMain.handle('deadlines:ical-export', async (_event, filters?: unknown, privacyLevel?: unknown) => {
    const rows = deadlines().list(assertOptionalObject<DeadlineListFilters>(filters, 'deadlines:ical-export', 'Filter') ?? {});
    return exportDeadlinesToIcal(rows, { privacyLevel: (privacyLevel === 'case_reference' || privacyLevel === 'details' ? privacyLevel : 'privacy_first') as DeadlineIcalPrivacyLevel });
  });
}
