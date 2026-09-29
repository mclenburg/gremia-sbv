import type { CreateGremiaBrInformationRequestInput, GremiaBrInformationRequest, GremiaBrProcedureDetail } from '../../src/domain/models/gremia-br.model.js';
import { gremiaBrRecord } from './gremiaBrPayload.js';
import { GremiaBrAuthService } from './gremiaBrAuthService.js';

function informationRequestFromResponse(value: unknown, procedureId: string): GremiaBrInformationRequest {
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
}

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
    return response.map((value) => informationRequestFromResponse(value, procedureId));
  }

  async createInformationRequest(procedureId: string, input: Pick<CreateGremiaBrInformationRequestInput, 'items' | 'reason' | 'responseDueAt'>): Promise<GremiaBrInformationRequest> {
    const items = typeof input.items === 'string' ? input.items.trim() : '';
    if (!items || items.length > 4096) throw new Error('Bitte die fehlenden Angaben mit höchstens 4096 Zeichen beschreiben.');
    const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
    if (reason.length > 1024) throw new Error('Die Begründung darf höchstens 1024 Zeichen umfassen.');
    if (input.responseDueAt && (typeof input.responseDueAt !== 'string' || !Number.isFinite(Date.parse(input.responseDueAt)))) {
      throw new Error('Die Antwortfrist ist ungültig. Bitte das Datum prüfen.');
    }
    const body = {
      items,
      ...(reason ? { reason } : {}),
      ...(input.responseDueAt ? { responseDueAt: input.responseDueAt } : {}),
    };
    return informationRequestFromResponse(await this.auth.post<unknown>(`/api/v1/procedures/${encodeURIComponent(procedureId)}/information-requests`, { body }), procedureId);
  }

  async completeInformationRequest(procedureId: string, requestId: string, expectedVersion: number): Promise<GremiaBrInformationRequest> {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) throw new Error('Die Version der Informationsanforderung ist ungültig.');
    const current = (await this.listInformationRequests(procedureId)).find((request) => request.id === requestId);
    if (!current || !['OPEN', 'PARTIALLY_FULFILLED'].includes(current.status) || current.version !== expectedVersion) {
      throw new Error('Die Informationsanforderung ist nicht mehr offen oder wurde geändert. Bitte die Liste bewusst neu laden.');
    }
    const resolved = informationRequestFromResponse(await this.auth.post<unknown>(
      `/api/v1/procedures/information-requests/${encodeURIComponent(requestId)}/resolve`,
      { body: { to: 'FULFILLED', expectedVersion } },
    ), procedureId);
    if (resolved.id !== requestId || resolved.status !== 'FULFILLED') {
      throw new Error('Gremia.BR hat den Abschluss nicht eindeutig bestätigt. Bitte die Liste bewusst neu laden.');
    }
    return resolved;
  }
}
