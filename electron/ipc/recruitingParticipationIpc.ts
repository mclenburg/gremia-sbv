import type { IpcMain } from 'electron';
import { RecruitingParticipationService } from '../../services/recruitingParticipationService.js';
import type { SecurityService } from '../../services/securityService.js';
import type {
  CreateRecruitingInterviewEventInput,
  CreateRecruitingParticipationInput,
  UpdateRecruitingInterviewEventInput,
  UpdateRecruitingParticipationInput,
} from '../../src/app/core/models/recruiting-participation.model.js';
import { assertRecordInput, assertString } from './ipcValidation.js';

export function registerRecruitingParticipationIpc(
  ipcMain: IpcMain,
  security: SecurityService,
): void {
  const recruiting = () => new RecruitingParticipationService(security.getActiveDatabase());

  ipcMain.handle('recruitingParticipations:list', async () => recruiting().list());

  ipcMain.handle('recruitingParticipations:get', async (_event, id: unknown) =>
    recruiting().getById(assertString(id, 'recruitingParticipations:get', 'Stellenbesetzungs-ID', { minLength: 1, maxLength: 120 })) ?? null,
  );

  ipcMain.handle('recruitingParticipations:create', async (_event, input: unknown) =>
    recruiting().create(assertRecordInput<CreateRecruitingParticipationInput>(input, 'recruitingParticipations:create')),
  );

  ipcMain.handle('recruitingParticipations:update', async (_event, id: unknown, input: unknown) =>
    recruiting().update(
      assertString(id, 'recruitingParticipations:update', 'Stellenbesetzungs-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateRecruitingParticipationInput>(input, 'recruitingParticipations:update'),
    ),
  );

  ipcMain.handle('recruitingParticipations:delete', async (_event, id: unknown) => {
    recruiting().delete(assertString(id, 'recruitingParticipations:delete', 'Stellenbesetzungs-ID', { minLength: 1, maxLength: 120 }));
    return { deleted: true };
  });

  ipcMain.handle('recruitingParticipations:interviews:list', async (_event, participationId: unknown) =>
    recruiting().listInterviews(assertString(participationId, 'recruitingParticipations:interviews:list', 'Stellenbesetzungs-ID', { minLength: 1, maxLength: 120 })),
  );

  ipcMain.handle('recruitingParticipations:interviews:create', async (_event, input: unknown) =>
    recruiting().addInterview(assertRecordInput<CreateRecruitingInterviewEventInput>(input, 'recruitingParticipations:interviews:create')),
  );

  ipcMain.handle('recruitingParticipations:interviews:update', async (_event, id: unknown, input: unknown) =>
    recruiting().updateInterview(
      assertString(id, 'recruitingParticipations:interviews:update', 'Vorstellungsgespräch-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateRecruitingInterviewEventInput>(input, 'recruitingParticipations:interviews:update'),
    ),
  );

  ipcMain.handle('recruitingParticipations:interviews:delete', async (_event, id: unknown) => {
    recruiting().deleteInterview(assertString(id, 'recruitingParticipations:interviews:delete', 'Vorstellungsgespräch-ID', { minLength: 1, maxLength: 120 }));
    return { deleted: true };
  });
}
