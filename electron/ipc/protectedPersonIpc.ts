import { IPC_CHANNELS, issueSelectedFileCapability, registerIpcHandler, resolveSelectedFileInput, SELECTED_FILE_PURPOSE } from './ipcHandler.js';
import type { IpcMain } from 'electron';
import { dialog } from 'electron';
import { exportDeadlinesToIcal, type DeadlineIcalPrivacyLevel } from '../../services/deadlineIcalExportService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import type { CreateProtectedPersonInput, PersonImportExecuteInput, PersonImportPreviewInput, ProtectedPersonListFilters, UpdateProtectedPersonInput } from '../../src/domain/models/protected-person.model.js';
import type { DeadlineListFilters } from '../../src/domain/models/deadline.model.js';
import type { PrivacyReviewActionInput } from '../../src/domain/models/privacy-review.model.js';
import { assertAllowedEnum, assertOptionalObject, assertRecordInput, assertString } from './ipcValidation.js';

export function registerProtectedPersonIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  const persons = services.protectedPersons, imports = services.personImport, expiry = services.personStatusExpiry;
  const anonymization = services.personAnonymization, deadlines = services.deadlines, privacyReviews = services.privacyReviews;
  const retention = () => services.retention();

  registerIpcHandler(ipcMain, IPC_CHANNELS.personsList, async (_event, filters?: unknown) =>
    persons().list(assertOptionalObject<ProtectedPersonListFilters>(filters, 'persons:list', 'Filter') ?? {}),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.personsCreate, async (_event, input: unknown) =>
    persons().create(assertRecordInput<CreateProtectedPersonInput>(input, 'persons:create')),
  );


  registerIpcHandler(ipcMain, IPC_CHANNELS.personsCreateAnonymousRequest, async (_event, label?: unknown) =>
    persons().createAnonymousRequest(typeof label === 'string' ? label : undefined),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.personsUpdate, async (_event, id: unknown, input: unknown) => {
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

  registerIpcHandler(ipcMain, IPC_CHANNELS.personsLinkCase, async (_event, personId: unknown, caseId: unknown, reason?: unknown) =>
    persons().linkCase(
      assertString(personId, 'persons:link-case', 'Person-ID', { minLength: 1, maxLength: 120 }),
      assertString(caseId, 'persons:link-case', 'Fall-ID', { minLength: 1, maxLength: 120 }),
      typeof reason === 'string' ? reason : undefined,
    ),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.personsImportPreview, async (_event, input: unknown) =>
    imports().preview(resolveSelectedFileInput(assertRecordInput<PersonImportPreviewInput>(input, 'persons:import:preview'), SELECTED_FILE_PURPOSE.personImport, 'persons:import:preview')),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.personsImportExecute, async (_event, input: unknown) =>
    imports().execute(resolveSelectedFileInput(assertRecordInput<PersonImportExecuteInput>(input, 'persons:import:execute'), SELECTED_FILE_PURPOSE.personImport, 'persons:import:execute')),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.personsImportSelectPreview, async () => {
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
    const capability = issueSelectedFileCapability(filePath, SELECTED_FILE_PURPOSE.personImport);
    return { filePath: capability.fileToken, sourceFileName: capability.fileName, fileType };
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.personsExpiryEvaluate, async (_event, referenceIso?: unknown) =>
    expiry().evaluate(typeof referenceIso === 'string' ? new Date(referenceIso) : new Date()),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.personsAnonymize, async (_event, id: unknown, reason: unknown) =>
    anonymization().anonymizeStructuredPersonData(
      assertString(id, 'persons:anonymize', 'Person-ID', { minLength: 1, maxLength: 120 }),
      assertString(reason, 'persons:anonymize', 'Grund', { minLength: 3, maxLength: 5_000 }),
    ),
  );


  registerIpcHandler(ipcMain, IPC_CHANNELS.personsDelete, async (_event, id: unknown, reason: unknown) =>
    anonymization().deleteStructuredPersonData(
      assertString(id, 'persons:delete', 'Person-ID', { minLength: 1, maxLength: 120 }),
      assertString(reason, 'persons:delete', 'Grund', { minLength: 3, maxLength: 5_000 }),
    ),
  );



  registerIpcHandler(ipcMain, IPC_CHANNELS.privacyReviewListOpenForPerson, async (_event, protectedPersonId: unknown) =>
    privacyReviews().listOpenForPerson(assertString(protectedPersonId, 'privacy-review:list-open-for-person', 'Person-ID', { minLength: 1, maxLength: 120 })),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.privacyReviewDocumentRetention, async (_event, input: unknown) => {
    const checked = assertRecordInput<PrivacyReviewActionInput>(input, 'privacy-review:document-retention');
    privacyReviews().documentRetention(
      assertString(checked.caseId, 'privacy-review:document-retention', 'Fall-ID', { minLength: 1, maxLength: 120 }),
      assertString(checked.reason, 'privacy-review:document-retention', 'Grund', { minLength: 1, maxLength: 5_000 }),
      assertString(checked.reviewAt, 'privacy-review:document-retention', 'Prüftermin', { minLength: 1, maxLength: 120 })
    );
    return { ok: true, message: 'Fortspeicherung wurde dokumentiert.' };
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.privacyReviewScheduleLater, async (_event, input: unknown) => {
    const checked = assertRecordInput<PrivacyReviewActionInput>(input, 'privacy-review:schedule-later');
    privacyReviews().scheduleLater(
      assertString(checked.caseId, 'privacy-review:schedule-later', 'Fall-ID', { minLength: 1, maxLength: 120 }),
      assertString(checked.reason, 'privacy-review:schedule-later', 'Grund', { minLength: 1, maxLength: 5_000 }),
      assertString(checked.reviewAt, 'privacy-review:schedule-later', 'Prüftermin', { minLength: 1, maxLength: 120 })
    );
    return { ok: true, message: 'Datenschutzprüfung wurde erneut terminiert.' };
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.privacyReviewClearCase, async (_event, input: unknown) => {
    const checked = assertRecordInput<PrivacyReviewActionInput>(input, 'privacy-review:clear-case');
    privacyReviews().clearCaseReview(
      assertString(checked.caseId, 'privacy-review:clear-case', 'Fall-ID', { minLength: 1, maxLength: 120 }),
      assertString(checked.reason, 'privacy-review:clear-case', 'Grund', { minLength: 1, maxLength: 5_000 })
    );
    return { ok: true, message: 'Datenschutzprüfung wurde abgeschlossen.' };
  });


  registerIpcHandler(ipcMain, IPC_CHANNELS.privacyReviewAnonymizeCase, async (_event, input: unknown) => {
    const checked = assertRecordInput<PrivacyReviewActionInput>(input, 'privacy-review:anonymize-case');
    const caseId = assertString(checked.caseId, 'privacy-review:anonymize-case', 'Fall-ID', { minLength: 1, maxLength: 120 });
    return services.caseAnonymization().anonymizeCase(
      caseId,
      assertString(checked.reason, 'privacy-review:anonymize-case', 'Grund', { minLength: 1, maxLength: 5_000 }),
      assertString(checked.confirmation, 'privacy-review:anonymize-case', 'Bestätigung', { minLength: 1, maxLength: 200 }), assertAllowedEnum(checked.anonymizationMode, 'privacy-review:anonymize-case', 'Anonymisierungsmodus', ['marked_free_text', 'replace_all_free_text'] as const),
    );
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.privacyReviewDeleteCase, async (_event, input: unknown) => {
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

  registerIpcHandler(ipcMain, IPC_CHANNELS.privacyReviewBulkMarkClosedLegacy, async () => {
    const result = privacyReviews().bulkMarkClosedLegacyCasesForAnonymization();
    return { ok: true, ...result, message: `${result.marked} abgeschlossene Altakten wurden zur Datenschutzprüfung vorgemerkt.` };
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.deadlinesIcalExport, async (_event, filters?: unknown, privacyLevel?: unknown) => {
    const rows = deadlines().list(assertOptionalObject<DeadlineListFilters>(filters, 'deadlines:ical-export', 'Filter') ?? {});
    return exportDeadlinesToIcal(rows, { privacyLevel: (privacyLevel === 'privacy_first' || privacyLevel === 'process_type' || privacyLevel === 'case_reference' || privacyLevel === 'details' ? privacyLevel : 'process_type') as DeadlineIcalPrivacyLevel });
  });
}
