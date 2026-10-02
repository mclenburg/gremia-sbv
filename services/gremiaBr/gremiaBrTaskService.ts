import { GREMIA_BR_TASK_STATUSES } from '../../src/domain/models/gremia-br.model.js';
import { ApplicationError } from '../../src/domain/models/application-error.model.js';
import type { GremiaBrOwnTaskDetail, GremiaBrTaskStatus, GremiaBrTaskTransitionOptions } from '../../src/domain/models/gremia-br.model.js';
import { GremiaBrAuthService } from './gremiaBrAuthService.js';
import { gremiaBrRecord } from './gremiaBrPayload.js';

const STATUS_SET: ReadonlySet<string> = new Set(GREMIA_BR_TASK_STATUSES);
const UNCONFIRMED_TRANSITION_MESSAGE = 'Gremia.BR hat die Statusänderung nicht eindeutig bestätigt. Bitte Gremia.BR aktualisieren und den Aufgabenstand prüfen, bevor Sie erneut handeln.';

function isTaskStatus(value: unknown): value is GremiaBrTaskStatus {
  return typeof value === 'string' && STATUS_SET.has(value);
}

function taskDetailFromResponse(value: unknown, id: string): GremiaBrOwnTaskDetail {
  const item = gremiaBrRecord(value);
  if (!item || item.id !== id || typeof item.title !== 'string' || !isTaskStatus(item.status)
      || typeof item.version !== 'number' || !Number.isInteger(item.version) || item.version < 0) {
    throw new Error('Gremia.BR hat keine gültigen Aufgabendetails zurückgegeben. Bitte den Arbeitsstand erneut aktualisieren.');
  }
  return {
    id,
    title: item.title,
    status: item.status,
    version: item.version,
    ...(typeof item.description === 'string' ? { description: item.description } : {}),
    ...(typeof item.dueAt === 'string' ? { dueAt: item.dueAt } : {}),
    ...(typeof item.subjectType === 'string' ? { subjectType: item.subjectType } : {}),
  };
}

export class GremiaBrTaskService {
  constructor(private readonly auth: GremiaBrAuthService) {}

  async getDetail(id: string): Promise<GremiaBrOwnTaskDetail> {
    if (this.auth.getReadContext().apiMode !== 'gremia_br_v2') throw new Error('Aufgabendetails sind nur mit Gremia.BR 2.0 verfügbar.');
    return taskDetailFromResponse(await this.auth.get<unknown>(`/api/v1/tasks/${encodeURIComponent(id)}`), id);
  }

  async getTransitionOptions(id: string): Promise<GremiaBrTaskTransitionOptions> {
    const response = gremiaBrRecord(await this.auth.get<unknown>(`/api/v1/tasks/${encodeURIComponent(id)}/transitions`));
    if (!response || !isTaskStatus(response.from) || !Array.isArray(response.allowed) || !response.allowed.every(isTaskStatus)) {
      throw new Error('Gremia.BR hat keine gültigen Statusmöglichkeiten zurückgegeben. Bitte die Aufgabe erneut öffnen.');
    }
    return { from: response.from, allowed: [...response.allowed] };
  }

  async transition(id: string, to: string, expectedVersion: number): Promise<GremiaBrOwnTaskDetail> {
    if (!isTaskStatus(to) || !Number.isInteger(expectedVersion) || expectedVersion < 0) {
      throw new Error('Die gewählte Statusänderung ist ungültig. Bitte die Aufgabe erneut öffnen.');
    }
    const response = await this.auth.post<unknown>(`/api/v1/procedures/tasks/${encodeURIComponent(id)}/transitions`, {
      body: { to, expectedVersion },
    });
    let detail: GremiaBrOwnTaskDetail;
    try {
      detail = taskDetailFromResponse(response, id);
    } catch {
      throw new ApplicationError('CONFLICT', UNCONFIRMED_TRANSITION_MESSAGE);
    }
    if (detail.status !== to || detail.version <= expectedVersion) {
      throw new ApplicationError('CONFLICT', UNCONFIRMED_TRANSITION_MESSAGE);
    }
    return detail;
  }
}
