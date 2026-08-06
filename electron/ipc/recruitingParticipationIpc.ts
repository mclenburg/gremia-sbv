import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
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
  services: ApplicationServices,
): void {
  const recruiting = services.recruitingParticipation;

  registerIpcHandler(ipcMain, IPC_CHANNELS.recruitingParticipationsList, async () => recruiting().list());

  registerIpcHandler(ipcMain, IPC_CHANNELS.recruitingParticipationsGet, async (_event, id: unknown) =>
    recruiting().getById(assertString(id, 'recruitingParticipations:get', 'Stellenbesetzungs-ID', { minLength: 1, maxLength: 120 })) ?? null,
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.recruitingParticipationsCreate, async (_event, input: unknown) =>
    recruiting().create(assertRecordInput<CreateRecruitingParticipationInput>(input, 'recruitingParticipations:create')),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.recruitingParticipationsUpdate, async (_event, id: unknown, input: unknown) =>
    recruiting().update(
      assertString(id, 'recruitingParticipations:update', 'Stellenbesetzungs-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateRecruitingParticipationInput>(input, 'recruitingParticipations:update'),
    ),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.recruitingParticipationsDelete, async (_event, id: unknown) => {
    recruiting().delete(assertString(id, 'recruitingParticipations:delete', 'Stellenbesetzungs-ID', { minLength: 1, maxLength: 120 }));
    return { deleted: true };
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.recruitingParticipationsInterviewsList, async (_event, participationId: unknown) =>
    recruiting().listInterviews(assertString(participationId, 'recruitingParticipations:interviews:list', 'Stellenbesetzungs-ID', { minLength: 1, maxLength: 120 })),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.recruitingParticipationsInterviewsCreate, async (_event, input: unknown) =>
    recruiting().addInterview(assertRecordInput<CreateRecruitingInterviewEventInput>(input, 'recruitingParticipations:interviews:create')),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.recruitingParticipationsInterviewsUpdate, async (_event, id: unknown, input: unknown) =>
    recruiting().updateInterview(
      assertString(id, 'recruitingParticipations:interviews:update', 'Vorstellungsgespräch-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateRecruitingInterviewEventInput>(input, 'recruitingParticipations:interviews:update'),
    ),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.recruitingParticipationsInterviewsDelete, async (_event, id: unknown) => {
    recruiting().deleteInterview(assertString(id, 'recruitingParticipations:interviews:delete', 'Vorstellungsgespräch-ID', { minLength: 1, maxLength: 120 }));
    return { deleted: true };
  });
}
