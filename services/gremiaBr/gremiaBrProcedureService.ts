import type { GremiaBrInformationRequest, GremiaBrProcedureDetail } from '../../src/domain/models/gremia-br.model.js';
import { gremiaBrRecord } from './gremiaBrPayload.js';
import { GremiaBrAuthService } from './gremiaBrAuthService.js';

export class GremiaBrProcedureService {
  constructor(private readonly auth: GremiaBrAuthService) {}

  async getDetail(id: string, expectedCaseId: string): Promise<GremiaBrProcedureDetail> {
    const item = gremiaBrRecord(await this.auth.get<unknown>(`/api/v1/procedures/${encodeURIComponent(id)}`));
    if (!item || item.id !== id || item.masterCaseId !== expectedCaseId
      || typeof item.procedureType !== 'string' || typeof item.state !== 'string'
      || typeof item.workflow !== 'string' || typeof item.openedAt !== 'string'
      || typeof item.version !== 'number' || !Number.isInteger(item.version)) {
      throw new Error('Gremia.BR hat widersprüchliche oder unvollständige Verfahrensdetails geliefert. Bitte den Arbeitsstand bewusst aktualisieren.');
    }
    return {
      id,
      masterCaseId: expectedCaseId,
      procedureType: item.procedureType,
      state: item.state,
      workflow: item.workflow,
      openedAt: item.openedAt,
      version: item.version,
    };
  }

  async listInformationRequests(procedureId: string): Promise<GremiaBrInformationRequest[]> {
    const response = await this.auth.get<unknown>(`/api/v1/procedures/${encodeURIComponent(procedureId)}/information-requests`);
    if (!Array.isArray(response)) throw new Error('Gremia.BR hat keine gültige Liste der Informationsanforderungen geliefert.');
    return response.map((value) => {
      const item = gremiaBrRecord(value);
      if (!item || typeof item.id !== 'string' || item.procedureId !== procedureId
        || !['OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED', 'WITHDRAWN'].includes(String(item.status))
        || typeof item.requestedAt !== 'string' || typeof item.version !== 'number' || !Number.isInteger(item.version)) {
        throw new Error('Gremia.BR hat eine widersprüchliche Informationsanforderung geliefert. Bitte erneut bewusst abrufen.');
      }
      return {
        id: item.id,
        procedureId,
        status: item.status as GremiaBrInformationRequest['status'],
        requestedAt: item.requestedAt,
        ...(typeof item.responseDueAt === 'string' ? { responseDueAt: item.responseDueAt } : {}),
        version: item.version,
      };
    });
  }
}
