import type { GremiaBrProcedureDetail } from '../../src/domain/models/gremia-br.model.js';
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
}
