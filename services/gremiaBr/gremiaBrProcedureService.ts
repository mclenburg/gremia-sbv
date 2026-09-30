import { GREMIA_BR_TASK_STATUSES } from '../../src/domain/models/gremia-br.model.js';
import type { CreateGremiaBrInformationRequestInput, CreateGremiaBrProcedureTaskInput, GremiaBrInformationRequest, GremiaBrOwnTaskDetail, GremiaBrProcedureDetail } from '../../src/domain/models/gremia-br.model.js';
import { gremiaBrRecord } from './gremiaBrPayload.js';
import { GremiaBrAuthService } from './gremiaBrAuthService.js';
import { GremiaBrHttpError } from './gremiaBrHttpClient.js';
import { randomUUID } from 'node:crypto';

function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function procedureOutcome(value: unknown, procedureId: string): GremiaBrProcedureDetail['outcome'] {
  if (value === null) return null;
  const item = gremiaBrRecord(value);
  if (!item || item.procedureId !== procedureId || typeof item.outcomeCode !== 'string' || !validDate(item.recordedAt)) {
    throw new Error('Gremia.BR hat ein widersprüchliches Verfahrensergebnis geliefert. Bitte den Stand erneut bewusst laden.');
  }
  return { code: item.outcomeCode, recordedAt: item.recordedAt };
}

function procedureDeadlines(value: unknown, procedureId: string): GremiaBrProcedureDetail['deadlines'] {
  if (!Array.isArray(value)) throw new Error('Gremia.BR hat keine gültige Fristenliste geliefert.');
  return value.map((entry) => {
    const item = gremiaBrRecord(entry);
    if (!item || item.procedureId !== procedureId || typeof item.id !== 'string' || typeof item.rule !== 'string'
      || typeof item.status !== 'string' || !validDate(item.calculatedDeadline)
      || (item.confirmedDeadline != null && !validDate(item.confirmedDeadline))) {
      throw new Error('Gremia.BR hat eine widersprüchliche Verfahrensfrist geliefert. Bitte den Stand erneut bewusst laden.');
    }
    return { id: item.id, rule: item.rule, dueAt: (item.confirmedDeadline ?? item.calculatedDeadline) as string, status: item.status };
  });
}

function procedureDeferrals(value: unknown, procedureId: string): GremiaBrProcedureDetail['deferrals'] {
  if (!Array.isArray(value)) throw new Error('Gremia.BR hat keine gültige Wiedervorlagenliste geliefert.');
  return value.map(gremiaBrRecord).filter((item) => item?.subjectType === 'PROCEDURE' && item.subjectId === procedureId && item.active === true)
    .map((item) => {
      if (!item || typeof item.id !== 'string' || typeof item.title !== 'string' || !validDate(item.nextDueAt)) {
        throw new Error('Gremia.BR hat eine widersprüchliche Wiedervorlage geliefert. Bitte den Stand erneut bewusst laden.');
      }
      return { id: item.id, title: item.title, dueAt: item.nextDueAt };
    });
}

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
    const path = `/api/v1/procedures/${encodeURIComponent(id)}`;
    const correlationId = randomUUID();
    const options = { correlationId };
    const item = gremiaBrRecord(await this.auth.get<unknown>(path, options));
    if (!item || item.id !== id || item.masterCaseId !== expectedCaseId
      || typeof item.procedureType !== 'string' || typeof item.state !== 'string'
      || typeof item.workflow !== 'string' || typeof item.openedAt !== 'string'
      || typeof item.version !== 'number' || !Number.isInteger(item.version)
      || typeof item.technicalCompleteness !== 'string' || typeof item.substantiveCompleteness !== 'string') {
      throw new Error('Gremia.BR hat widersprüchliche oder unvollständige Verfahrensdetails geliefert. Bitte den Arbeitsstand bewusst aktualisieren.');
    }
    let rawOutcome: unknown;
    try { rawOutcome = await this.auth.get<unknown>(`${path}/outcome`, options); }
    catch (error) { if (error instanceof GremiaBrHttpError && error.status === 404) rawOutcome = null; else throw error; }
    const rawDeadlines = await this.auth.get<unknown>(`${path}/deadlines`, options);
    const rawDeferrals = await this.auth.get<unknown>(`${path}/deferrals`, options);
    return {
      id,
      masterCaseId: expectedCaseId,
      procedureType: item.procedureType,
      state: item.state,
      workflow: item.workflow,
      openedAt: item.openedAt,
      version: item.version,
      technicalCompleteness: item.technicalCompleteness,
      substantiveCompleteness: item.substantiveCompleteness,
      outcome: procedureOutcome(rawOutcome, id),
      deadlines: procedureDeadlines(rawDeadlines, id),
      deferrals: procedureDeferrals(rawDeferrals, id),
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

  async createOwnTask(procedureId: string, input: Pick<CreateGremiaBrProcedureTaskInput, 'title' | 'description' | 'dueAt'>): Promise<GremiaBrOwnTaskDetail> {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    if (!title || title.length > 512) throw new Error('Bitte einen Aufgabentitel mit höchstens 512 Zeichen eingeben.');
    if (description.length > 4096) throw new Error('Die Aufgabenbeschreibung darf höchstens 4096 Zeichen umfassen.');
    if (input.dueAt && (typeof input.dueAt !== 'string' || !Number.isFinite(Date.parse(input.dueAt)))) {
      throw new Error('Die Aufgabenfälligkeit ist ungültig. Bitte das Datum prüfen.');
    }
    const session = gremiaBrRecord(await this.auth.get<unknown>('/api/v1/auth/session'));
    if (typeof session?.userId !== 'string' || !session.userId.trim()) {
      throw new Error('Die eigene Gremia.BR-Identität konnte nicht bestätigt werden. Es wurde keine Aufgabe angelegt.');
    }
    const body = {
      title,
      ...(description ? { description } : {}),
      ...(input.dueAt ? { dueAt: input.dueAt } : {}),
      assignments: [{ kind: 'PERSON', reference: session.userId, role: 'RESPONSIBLE' }],
    };
    const item = gremiaBrRecord(await this.auth.post<unknown>(`/api/v1/procedures/${encodeURIComponent(procedureId)}/tasks`, { body }));
    if (!item || typeof item.id !== 'string' || item.title !== title || item.subjectType !== 'PROCEDURE'
      || item.subjectId !== procedureId || typeof item.status !== 'string' || !GREMIA_BR_TASK_STATUSES.includes(item.status as GremiaBrOwnTaskDetail['status'])
      || typeof item.version !== 'number' || !Number.isInteger(item.version)) {
      throw new Error('Gremia.BR hat die Aufgabenanlage nicht eindeutig bestätigt. Bitte den eigenen Arbeitsstand bewusst aktualisieren, bevor Sie erneut anlegen.');
    }
    return {
      id: item.id, title, status: item.status as GremiaBrOwnTaskDetail['status'], version: item.version,
      subjectType: item.subjectType as GremiaBrOwnTaskDetail['subjectType'],
      ...(typeof item.dueAt === 'string' ? { dueAt: item.dueAt } : {}),
    };
  }
}
