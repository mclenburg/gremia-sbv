import type { GremiaBrAuthService } from './gremiaBrAuthService.js';
import { GremiaBrHttpError } from './gremiaBrHttpClient.js';
import { ApplicationError } from '../../src/domain/models/application-error.model.js';
import type { GremiaBrCachedOverview } from '../../src/domain/models/gremia-br.model.js';

export class GremiaBrMeetingAccessService {
  constructor(private readonly auth: Pick<GremiaBrAuthService, 'get' | 'getReadContext'>) {}

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
