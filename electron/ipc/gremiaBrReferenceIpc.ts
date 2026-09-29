import type { IpcMain } from 'electron';
import type { ApplicationServices } from '../applicationServices.js';
import type { CompleteGremiaBrInformationRequestInput, CreateGremiaBrExternalReferenceInput, CreateGremiaBrInformationRequestInput, CreateGremiaBrProcedureTaskInput } from '../../src/domain/models/gremia-br.model.js';
import { ApplicationError } from '../../src/domain/models/application-error.model.js';
import { GremiaBrHttpError } from '../../services/gremiaBr/gremiaBrHttpClient.js';
import { GremiaBrHttpReadAdapter } from '../../services/gremiaBr/gremiaBrHttpReadAdapter.js';
import { GremiaBrProcedureService } from '../../services/gremiaBr/gremiaBrProcedureService.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertRecordInput, assertString } from './ipcValidation.js';

export function registerGremiaBrReferenceIpc(ipcMain: IpcMain, services: ApplicationServices): void {
  const { gremiaBrAuth: auth, gremiaBrCache: cache, gremiaBrReferences: references } = services;

  function accessibleProcedure(rawId: unknown, channel: string) {
    const id = assertString(rawId, channel, 'Verfahrens-ID', { minLength: 1, maxLength: 120 });
    const remoteCase = cache.getOverview().accessibleCases?.find((item) => item.procedureIds.includes(id));
    if (!remoteCase) throw new ApplicationError('NOT_FOUND', 'Dieses Verfahren gehört nicht zum aktuellen berechtigten Arbeitsstand. Bitte Gremia.BR bewusst aktualisieren.');
    return { id, remoteCase };
  }

  function linkedProcedure(rawCaseId: unknown, rawProcedureId: unknown, channel: string) {
    const caseId = assertString(rawCaseId, channel, 'Fallakten-ID', { minLength: 1, maxLength: 120 });
    const { id } = accessibleProcedure(rawProcedureId, channel);
    if (!references.listForCase(caseId).some((link) => link.sourceType === 'verfahren' && link.sourceId === id)) {
      throw new ApplicationError('NOT_FOUND', 'Dieses Verfahren ist nicht mit der ausgewählten Fallakte verknüpft.');
    }
    return { caseId, id };
  }

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrProcedureDetailGet, async (_event, rawId: unknown) => {
    const { id, remoteCase } = accessibleProcedure(rawId, 'gremia-br:procedure:detail:get');
    return new GremiaBrProcedureService(auth).getDetail(id, remoteCase.id);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrInformationRequestsList, async (_event, rawCaseId: unknown, rawProcedureId: unknown) => {
    const { id } = linkedProcedure(rawCaseId, rawProcedureId, 'gremia-br:procedure:information-requests:list');
    return new GremiaBrProcedureService(auth).listInformationRequests(id);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrInformationRequestCreate, async (_event, rawInput: unknown) => {
    const input = assertRecordInput<CreateGremiaBrInformationRequestInput>(rawInput, 'gremia-br:procedure:information-request:create');
    const { id } = linkedProcedure(input.caseId, input.procedureId, 'gremia-br:procedure:information-request:create');
    return new GremiaBrProcedureService(auth).createInformationRequest(id, input);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrInformationRequestComplete, async (_event, rawInput: unknown) => {
    const channel = 'gremia-br:procedure:information-request:complete';
    const input = assertRecordInput<CompleteGremiaBrInformationRequestInput>(rawInput, channel);
    const { id } = linkedProcedure(input.caseId, input.procedureId, channel);
    const requestId = assertString(input.requestId, channel, 'Anforderungs-ID', { minLength: 1, maxLength: 120 });
    try {
      return await new GremiaBrProcedureService(auth).completeInformationRequest(id, requestId, input.expectedVersion);
    } catch (error) {
      if (error instanceof GremiaBrHttpError && error.status === 409) {
        throw new ApplicationError('CONFLICT', 'Die Informationsanforderung wurde zwischenzeitlich geändert. Bitte die Liste bewusst neu laden.');
      }
      throw error;
    }
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrProcedureTaskCreate, async (_event, rawInput: unknown) => {
    const channel = 'gremia-br:procedure:task:create';
    const input = assertRecordInput<CreateGremiaBrProcedureTaskInput>(rawInput, channel);
    const { id } = linkedProcedure(input.caseId, input.procedureId, channel);
    return new GremiaBrProcedureService(auth).createOwnTask(id, input);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrInlineSuggest, async (_event, query: unknown) => {
    return references.suggestBrDecisions(new GremiaBrHttpReadAdapter(auth), assertString(query, 'gremia-br:inline-suggest', 'Suchbegriff', { minLength: 1, maxLength: 120 }));
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrReferencesList, async (_event, caseId: unknown) => {
    return references.listForCase(assertString(caseId, 'gremia-br:references:list', 'Fallakten-ID', { minLength: 1, maxLength: 120 }));
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrReferencesCreate, async (_event, input: unknown) => {
    const record = assertRecordInput<CreateGremiaBrExternalReferenceInput>(input, 'gremia-br:references:create');
    if (record.sourceType === 'verfahren') {
      const { remoteCase } = accessibleProcedure(record.sourceId, 'gremia-br:references:create');
      return references.createOrUpdate({
        caseId: record.caseId,
        sourceType: 'verfahren',
        sourceId: record.sourceId,
        title: `${remoteCase.reference} · ${remoteCase.subject}`,
      });
    }
    return references.createOrUpdate(record);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrReferencesDelete, async (_event, referenceId: unknown) => {
    return references.delete(assertString(referenceId, 'gremia-br:references:delete', 'Referenz-ID', { minLength: 1, maxLength: 120 }));
  });
}
