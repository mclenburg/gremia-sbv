import type { GremiaBrAuthService } from './gremiaBrAuthService.js';
import { GremiaBrHttpError } from './gremiaBrHttpClient.js';
import { ApplicationError } from '../../src/domain/models/application-error.model.js';
import type { GremiaBrCachedOverview } from '../../src/domain/models/gremia-br.model.js';
import type { GremiaBrAgendaChanges } from '../../src/domain/models/gremia-br.model.js';
import type { GremiaBrMinutesSummary } from '../../src/domain/models/gremia-br.model.js';

interface AgendaItem {
  itemKey: string;
  ordinal: number;
  title: string | null;
  description: string | null;
  type: string;
  expectsDecision: boolean;
  timeAllocationMinutes: number | null;
}

interface AgendaVersion {
  versionNumber: number;
  sealed: boolean;
  items: AgendaItem[];
}

function agendaVersion(value: unknown): AgendaVersion | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!Number.isInteger(record.versionNumber) || typeof record.sealed !== 'boolean' || !Array.isArray(record.items)) return null;
  const items: AgendaItem[] = [];
  const keys = new Set<string>();
  for (const candidate of record.items) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
    const item = candidate as Record<string, unknown>;
    if (typeof item.itemKey !== 'string' || !item.itemKey || keys.has(item.itemKey)
      || !Number.isInteger(item.ordinal) || typeof item.type !== 'string'
      || typeof item.expectsDecision !== 'boolean'
      || !(item.title == null || typeof item.title === 'string')
      || !(item.description == null || typeof item.description === 'string')
      || !(item.timeAllocationMinutes == null || typeof item.timeAllocationMinutes === 'number')) return null;
    keys.add(item.itemKey);
    items.push({
      itemKey: item.itemKey,
      ordinal: item.ordinal as number,
      title: item.title as string | null ?? null,
      description: item.description as string | null ?? null,
      type: item.type,
      expectsDecision: item.expectsDecision,
      timeAllocationMinutes: item.timeAllocationMinutes as number | null ?? null,
    });
  }
  return { versionNumber: record.versionNumber as number, sealed: record.sealed, items };
}

function agendaTitle(item: AgendaItem): string {
  return item.title?.trim() || 'Titel nicht freigegeben';
}

function agendaItemChanged(before: AgendaItem, current: AgendaItem): boolean {
  return before.ordinal !== current.ordinal || before.title !== current.title
    || before.description !== current.description || before.type !== current.type
    || before.expectsDecision !== current.expectsDecision
    || before.timeAllocationMinutes !== current.timeAllocationMinutes;
}

export class GremiaBrMeetingAccessService {
  constructor(private readonly auth: Pick<GremiaBrAuthService, 'get' | 'getReadContext'>) {}

  async getMinutes(meetingId: string, overview: GremiaBrCachedOverview): Promise<GremiaBrMinutesSummary | null> {
    const context = this.auth.getReadContext();
    const meetings = [overview.currentMeeting, overview.nextMeeting, ...overview.upcomingMeetings];
    const eligible = meetings.some((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      const meeting = value as Record<string, unknown>;
      return meeting.id === meetingId && meeting.bodyId === context.selectedBodyId;
    });
    if (!eligible) throw new ApplicationError('NOT_FOUND', 'Die Sitzung gehört nicht zum aktuellen Arbeitsstand. Bitte Gremia.BR aktualisieren.');
    let payload: unknown;
    try {
      payload = await this.auth.get<unknown>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/minutes`);
    } catch (error) {
      if (error instanceof GremiaBrHttpError && error.status === 404) return null;
      if (error instanceof GremiaBrHttpError && error.status === 403) {
        throw new ApplicationError('PERMISSION_DENIED', 'Gremia.BR erlaubt den Zugriff auf diese Niederschrift nicht. Bitte die Berechtigung dort prüfen.');
      }
      throw new ApplicationError('REMOTE_READ_FAILED', 'Die Niederschrift konnte nicht geladen werden. Bitte erneut abrufen.');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ApplicationError('REMOTE_READ_FAILED', 'Gremia.BR hat eine unvollständige Niederschrift geliefert.');
    }
    const minutes = payload as Record<string, unknown>;
    const kind = ['RESULT_MINUTES', 'PROCEEDINGS_MINUTES'];
    const statuses = ['DRAFT', 'CONTENT_REVIEW', 'CONTENT_FINAL', 'SIGNATURE_PENDING', 'SIGNED_EVIDENCE_COMPLETE', 'COMPLETED'];
    const protectionClasses = ['INTERNAL', 'CONFIDENTIAL', 'HIGH', 'RESTRICTED'];
    if (minutes.meetingId !== meetingId || !kind.includes(String(minutes.kind)) || !statuses.includes(String(minutes.status))
      || !protectionClasses.includes(String(minutes.protectionClass)) || !Number.isInteger(minutes.version)
      || typeof minutes.contentComplete !== 'boolean' || !Array.isArray(minutes.contentMissing)
      || !minutes.contentMissing.every((item) => typeof item === 'string')) {
      throw new ApplicationError('REMOTE_READ_FAILED', 'Gremia.BR hat eine unvollständige Niederschrift geliefert.');
    }
    return {
      kind: minutes.kind as GremiaBrMinutesSummary['kind'], status: minutes.status as GremiaBrMinutesSummary['status'],
      protectionClass: minutes.protectionClass as GremiaBrMinutesSummary['protectionClass'],
      version: minutes.version as number, contentComplete: minutes.contentComplete,
      contentMissing: minutes.contentMissing as string[],
    };
  }

  async getAgendaChanges(meetingId: string, overview: GremiaBrCachedOverview): Promise<GremiaBrAgendaChanges> {
    const context = this.auth.getReadContext();
    const meetings = [overview.currentMeeting, overview.nextMeeting, ...overview.upcomingMeetings];
    const eligible = meetings.some((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      const meeting = value as Record<string, unknown>;
      return meeting.id === meetingId && meeting.bodyId === context.selectedBodyId;
    });
    if (!eligible) throw new ApplicationError('NOT_FOUND', 'Die Sitzung gehört nicht zum aktuellen Arbeitsstand. Bitte Gremia.BR aktualisieren.');

    let currentPayload: unknown;
    let versionsPayload: unknown;
    try {
      currentPayload = await this.auth.get<unknown>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/agenda`);
      versionsPayload = await this.auth.get<unknown>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/agenda/versions`);
    } catch (error) {
      if (error instanceof GremiaBrHttpError && error.status === 403) {
        throw new ApplicationError('PERMISSION_DENIED', 'Gremia.BR erlaubt den Zugriff auf diese Tagesordnung nicht. Bitte die Berechtigung dort prüfen.');
      }
      throw new ApplicationError('REMOTE_READ_FAILED', 'Tagesordnung und Änderungen konnten nicht geladen werden. Bitte erneut abrufen.');
    }
    const current = agendaVersion(currentPayload);
    const versions = Array.isArray(versionsPayload) ? versionsPayload.map(agendaVersion) : null;
    if (!current || !versions || versions.some((version) => !version)) {
      throw new ApplicationError('REMOTE_READ_FAILED', 'Gremia.BR hat unvollständige Tagesordnungsdaten geliefert. Bitte erneut abrufen.');
    }
    const baseline = (versions as AgendaVersion[]).filter((version) => version.sealed)
      .sort((left, right) => left.versionNumber - right.versionNumber)[0];
    const items = [...current.items].sort((left, right) => left.ordinal - right.ordinal)
      .map((item) => ({ title: agendaTitle(item) }));
    if (!baseline) return { items, comparisonAvailable: false, changes: [] };

    const previousByKey = new Map(baseline.items.map((item) => [item.itemKey, item]));
    const currentByKey = new Map(current.items.map((item) => [item.itemKey, item]));
    const changes: GremiaBrAgendaChanges['changes'] = [];
    for (const item of current.items) {
      const previous = previousByKey.get(item.itemKey);
      if (!previous) changes.push({ kind: 'added', title: agendaTitle(item) });
      else if (agendaItemChanged(previous, item)) changes.push({ kind: 'changed', title: agendaTitle(item), previousTitle: agendaTitle(previous) });
    }
    for (const item of baseline.items) {
      if (!currentByKey.has(item.itemKey)) changes.push({ kind: 'removed', title: agendaTitle(item) });
    }
    return { items, comparisonAvailable: true, changes };
  }

  async getAccess(meetingId: string, overview: GremiaBrCachedOverview): Promise<string> {
    const context = this.auth.getReadContext();
    const meetings = [overview.currentMeeting, overview.nextMeeting, ...overview.upcomingMeetings];
    const eligible = context.apiMode === 'gremia_br_v2' && meetings.some((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      const meeting = value as Record<string, unknown>;
      return meeting.id === meetingId && meeting.bodyId === context.selectedBodyId
        && meeting.mode === 'HYBRID' && meeting.hasRemoteAccess === true;
    });
    if (!eligible) {
      throw new ApplicationError('NOT_FOUND', 'Für diese Sitzung ist im aktuellen Arbeitsstand kein Remote-Zugang vorgesehen. Bitte Gremia.BR aktualisieren.');
    }
    let response: unknown;
    try {
      response = await this.auth.get<unknown>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/remote-access`);
    } catch (error) {
      if (error instanceof GremiaBrHttpError && error.status === 403) {
        throw new ApplicationError('PERMISSION_DENIED', 'Gremia.BR erlaubt den Zugriff auf diesen Remote-Zugang nicht. Bitte die Berechtigung dort prüfen.');
      }
      if (error instanceof GremiaBrHttpError && error.status === 404) {
        throw new ApplicationError('NOT_FOUND', 'Für diese Sitzung ist kein Remote-Zugang mehr verfügbar. Bitte Gremia.BR aktualisieren.');
      }
      throw new ApplicationError('REMOTE_READ_FAILED', 'Remote-Zugang konnte nicht geladen werden. Bitte den Abruf erneut versuchen.');
    }
    if (!response || typeof response !== 'object' || Array.isArray(response)
      || typeof (response as Record<string, unknown>).access !== 'string'
      || !(response as { access: string }).access.trim()) {
      throw new ApplicationError('REMOTE_READ_FAILED', 'Gremia.BR hat keinen gültigen Remote-Zugang zurückgegeben. Bitte den Zugang dort prüfen.');
    }
    return (response as { access: string }).access;
  }
}
