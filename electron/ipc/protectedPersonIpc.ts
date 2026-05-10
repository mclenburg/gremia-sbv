import type { IpcMain } from 'electron';
import { dialog } from 'electron';
import { ProtectedPersonService } from '../../services/protectedPersonService.js';
import { PersonImportService } from '../../services/personImportService.js';
import { PersonStatusExpiryService } from '../../services/personStatusExpiryService.js';
import { PersonAnonymizationService } from '../../services/personAnonymizationService.js';
import { exportDeadlinesToIcal, type DeadlineIcalPrivacyLevel } from '../../services/deadlineIcalExportService.js';
import { DeadlineService } from '../../services/deadlineService.js';
import { PrivacyReviewService } from '../../services/privacyReviewService.js';
import { RetentionService } from '../../services/retentionService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CreateProtectedPersonInput, PersonImportExecuteInput, PersonImportPreviewInput, ProtectedPersonListFilters, UpdateProtectedPersonInput } from '../../src/app/core/models/protected-person.model.js';
import type { DeadlineListFilters } from '../../src/app/core/models/deadline.model.js';
import type { PrivacyReviewActionInput } from '../../src/app/core/models/privacy-review.model.js';
import { assertOptionalObject, assertRecordInput, assertString } from './ipcValidation.js';

export function registerProtectedPersonIpc(ipcMain: IpcMain, security: SecurityService): void {
  const persons = () => new ProtectedPersonService(security.getActiveDatabase());
  const imports = () => new PersonImportService(security.getActiveDatabase());
  const expiry = () => new PersonStatusExpiryService(security.getActiveDatabase());
  const anonymization = () => new PersonAnonymizationService(security.getActiveDatabase());
  const deadlines = () => new DeadlineService(security.getActiveDatabase());
  const privacyReviews = () => new PrivacyReviewService(security.getActiveDatabase());
  const retention = () => new RetentionService(() => security.getActiveDatabase(), () => security.getDataDirectory());

  ipcMain.handle('persons:list', async (_event, filters?: unknown) =>
    persons().list(assertOptionalObject<ProtectedPersonListFilters>(filters, 'persons:list', 'Filter') ?? {}),
  );

  ipcMain.handle('persons:create', async (_event, input: unknown) =>
    persons().create(assertRecordInput<CreateProtectedPersonInput>(input, 'persons:create')),
  );


  ipcMain.handle('persons:create-anonymous-request', async (_event, label?: unknown) =>
    persons().createAnonymousRequest(typeof label === 'string' ? label : undefined),
  );

  ipcMain.handle('persons:update', async (_event, id: unknown, input: unknown) => {
    const checkedId = assertString(id, 'persons:update', 'Person-ID', { minLength: 1, maxLength: 120 });
    const checkedInput = assertRecordInput<UpdateProtectedPersonInput>(input, 'persons:update');
    const service = persons();
    const before = service.get(checkedId);
    const updated = service.update(checkedId, checkedInput);
    if (before?.employmentState !== 'left_company' && updated.employmentState === 'left_company') {
      privacyReviews().markLinkedCasesForPerson(updated.id, 'employment_ended');
    }
    if (before?.protectionStatus !== 'expired' && updated.protectionStatus === 'expired') {
      privacyReviews().markLinkedCasesForPerson(updated.id, 'status_expired');
    }
    return updated;
  });

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


  ipcMain.handle('persons:delete', async (_event, id: unknown, reason: unknown) =>
    anonymization().deleteStructuredPersonData(
      assertString(id, 'persons:delete', 'Person-ID', { minLength: 1, maxLength: 120 }),
      assertString(reason, 'persons:delete', 'Grund', { minLength: 3, maxLength: 5_000 }),
    ),
  );



  ipcMain.handle('privacy-review:list-open-for-person', async (_event, protectedPersonId: unknown) =>
    privacyReviews().listOpenForPerson(assertString(protectedPersonId, 'privacy-review:list-open-for-person', 'Person-ID', { minLength: 1, maxLength: 120 })),
  );

  ipcMain.handle('privacy-review:document-retention', async (_event, input: unknown) => {
    const checked = assertRecordInput<PrivacyReviewActionInput>(input, 'privacy-review:document-retention');
    privacyReviews().documentRetention(
      assertString(checked.caseId, 'privacy-review:document-retention', 'Fall-ID', { minLength: 1, maxLength: 120 }),
      assertString(checked.reason, 'privacy-review:document-retention', 'Grund', { minLength: 1, maxLength: 5_000 }),
      assertString(checked.reviewAt, 'privacy-review:document-retention', 'Prüftermin', { minLength: 1, maxLength: 120 })
    );
    return { ok: true, message: 'Fortspeicherung wurde dokumentiert.' };
  });

  ipcMain.handle('privacy-review:schedule-later', async (_event, input: unknown) => {
    const checked = assertRecordInput<PrivacyReviewActionInput>(input, 'privacy-review:schedule-later');
    privacyReviews().scheduleLater(
      assertString(checked.caseId, 'privacy-review:schedule-later', 'Fall-ID', { minLength: 1, maxLength: 120 }),
      assertString(checked.reason, 'privacy-review:schedule-later', 'Grund', { minLength: 1, maxLength: 5_000 }),
      assertString(checked.reviewAt, 'privacy-review:schedule-later', 'Prüftermin', { minLength: 1, maxLength: 120 })
    );
    return { ok: true, message: 'Datenschutzprüfung wurde erneut terminiert.' };
  });

  ipcMain.handle('privacy-review:clear-case', async (_event, input: unknown) => {
    const checked = assertRecordInput<PrivacyReviewActionInput>(input, 'privacy-review:clear-case');
    privacyReviews().clearCaseReview(
      assertString(checked.caseId, 'privacy-review:clear-case', 'Fall-ID', { minLength: 1, maxLength: 120 }),
      assertString(checked.reason, 'privacy-review:clear-case', 'Grund', { minLength: 1, maxLength: 5_000 })
    );
    return { ok: true, message: 'Datenschutzprüfung wurde abgeschlossen.' };
  });


  ipcMain.handle('privacy-review:anonymize-case', async (_event, input: unknown) => {
    const checked = assertRecordInput<PrivacyReviewActionInput>(input, 'privacy-review:anonymize-case');
    const caseId = assertString(checked.caseId, 'privacy-review:anonymize-case', 'Fall-ID', { minLength: 1, maxLength: 120 });
    return privacyReviews().anonymizeCaseStructuredData(
      caseId,
      assertString(checked.reason, 'privacy-review:anonymize-case', 'Grund', { minLength: 1, maxLength: 5_000 }),
      assertString(checked.confirmation, 'privacy-review:anonymize-case', 'Bestätigung', { minLength: 1, maxLength: 200 })
    );
  });

  ipcMain.handle('privacy-review:delete-case', async (_event, input: unknown) => {
    const checked = assertRecordInput<PrivacyReviewActionInput>(input, 'privacy-review:delete-case');
    const caseId = assertString(checked.caseId, 'privacy-review:delete-case', 'Fall-ID', { minLength: 1, maxLength: 120 });
    const result = await retention().deleteCase(
      caseId,
      assertString(checked.reason, 'privacy-review:delete-case', 'Grund', { minLength: 1, maxLength: 5_000 }),
      assertString(checked.confirmation, 'privacy-review:delete-case', 'Bestätigung', { minLength: 1, maxLength: 200 })
    );
    if (result.ok) privacyReviews().markCaseDeleted(caseId);
    return result;
  });

  ipcMain.handle('privacy-review:bulk-mark-closed-legacy', async () => {
    const result = privacyReviews().bulkMarkClosedLegacyCasesForAnonymization();
    return { ok: true, ...result, message: `${result.marked} abgeschlossene Altakten wurden zur Datenschutzprüfung vorgemerkt.` };
  });

  ipcMain.handle('deadlines:ical-export', async (_event, filters?: unknown, privacyLevel?: unknown) => {
    const rows = deadlines().list(assertOptionalObject<DeadlineListFilters>(filters, 'deadlines:ical-export', 'Filter') ?? {});
    return exportDeadlinesToIcal(rows, { privacyLevel: (privacyLevel === 'privacy_first' || privacyLevel === 'process_type' || privacyLevel === 'case_reference' || privacyLevel === 'details' ? privacyLevel : 'process_type') as DeadlineIcalPrivacyLevel });
  });
}
