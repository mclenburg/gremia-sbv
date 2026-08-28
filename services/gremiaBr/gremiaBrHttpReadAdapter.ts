import { GremiaBrAuthService } from './gremiaBrAuthService.js';
import type { GremiaBrReadAdapter } from './gremiaBrTypes.js';

function arrayFromResponse(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.results)) return record.results;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.data)) return record.data;
  }
  return [];
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function idFromItem(item: unknown): string | undefined {
  const source = record(item);
  const id = source?.id ?? source?.uuid ?? source?.meetingId ?? source?.sitzungId ?? source?.decisionId ?? source?.beschlussId;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
}

function dateFromItem(item: unknown): number {
  const source = record(item);
  const value = source?.plannedStart ?? source?.date ?? source?.datum ?? source?.start;
  if (typeof value !== 'string') return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function textMatchesQuery(item: unknown, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase('de-DE');
  if (!needle) return true;
  return JSON.stringify(item, (_key, value) => {
    if (typeof value === 'string' && /^[0-9a-f-]{16,}$/i.test(value)) return undefined;
    return value;
  }).toLocaleLowerCase('de-DE').includes(needle);
}

export class GremiaBrHttpReadAdapter implements GremiaBrReadAdapter {
  private v2MeetingCache?: Promise<unknown[]>;
  private v2DecisionCache?: Promise<unknown[]>;

  constructor(private readonly auth: GremiaBrAuthService) {}

  async listWorksAgreements(): Promise<unknown[]> { return []; }
  async getReferenceById(id: string): Promise<unknown | null> { return this.getDecisionById(id); }

  async getDecisionById(id: string): Promise<unknown | null> {
    if (this.isV2()) return await this.auth.get<unknown | null>(`/api/v1/meetings/decisions/${encodeURIComponent(id)}`);
    const results = arrayFromResponse(await this.auth.get<unknown>('/search', {
      query: { q: id, types: ['beschluss'], limit: 1 },
    }));
    return results[0] ?? null;
  }

  async listRelevantMeetings(): Promise<unknown[]> {
    return this.getUpcomingMeetings();
  }

  async getNextMeeting(): Promise<unknown | null> {
    if (this.isV2()) return (await this.getUpcomingMeetings())[0] ?? null;
    return await this.auth.get<unknown | null>('/sitzungen/naechste');
  }

  async getCurrentMeeting(): Promise<unknown | null> {
    if (this.isV2()) {
      return (await this.listV2BodyMeetings())
        .filter((meeting) => record(meeting)?.status === 'IN_PROGRESS')
        .sort((left, right) => dateFromItem(left) - dateFromItem(right))[0] ?? null;
    }
    return await this.auth.get<unknown | null>('/sitzungen/aktuelle');
  }

  async getUpcomingMeetings(): Promise<unknown[]> {
    if (this.isV2()) {
      const now = Date.now();
      return (await this.listV2BodyMeetings())
        .filter((meeting) => {
          const item = record(meeting);
          return item?.status !== 'CANCELLED' && dateFromItem(meeting) >= now;
        })
        .sort((left, right) => dateFromItem(left) - dateFromItem(right));
    }
    return arrayFromResponse(await this.auth.get<unknown>('/sitzungen/kommende'));
  }

  async getPendingFollowUps(date?: string): Promise<unknown[]> {
    if (this.isV2()) return [];
    return arrayFromResponse(await this.auth.get<unknown>('/sitzungen/wiedervorlagen', {
      query: { datum: date },
    }));
  }

  async getMeetingById(id: string): Promise<unknown | null> {
    if (this.isV2()) return await this.auth.get<unknown | null>(`/api/v1/meetings/${encodeURIComponent(id)}`);
    return await this.auth.get<unknown | null>(`/sitzungen/${encodeURIComponent(id)}`);
  }

  async getMeetingAgenda(id: string): Promise<unknown[]> {
    if (this.isV2()) return arrayFromResponse(await this.auth.get<unknown>(`/api/v1/meetings/${encodeURIComponent(id)}/agenda`));
    return arrayFromResponse(await this.auth.get<unknown>(`/sitzungen/${encodeURIComponent(id)}/agenda`));
  }

  async getMeetingProtocolStatus(id: string): Promise<unknown | null> {
    if (this.isV2()) return await this.getProtocolByMeeting(id);
    return await this.auth.get<unknown | null>(`/sitzungen/${encodeURIComponent(id)}/protokoll-status`);
  }

  async listProtocols(): Promise<unknown[]> {
    if (this.isV2()) return [];
    return arrayFromResponse(await this.auth.get<unknown>('/protokolle'));
  }

  async getProtocolById(id: string): Promise<unknown | null> {
    if (this.isV2()) return null;
    return await this.auth.get<unknown | null>(`/protokolle/${encodeURIComponent(id)}`);
  }

  async getProtocolByMeeting(sitzungId: string): Promise<unknown | null> {
    if (this.isV2()) return await this.auth.get<unknown | null>(`/api/v1/meetings/${encodeURIComponent(sitzungId)}/minutes`);
    return await this.auth.get<unknown | null>(`/protokolle/sitzung/${encodeURIComponent(sitzungId)}`);
  }

  async listProtocolDecisions(id: string): Promise<unknown[]> {
    if (this.isV2()) return arrayFromResponse(await this.auth.get<unknown>(`/api/v1/meetings/${encodeURIComponent(id)}/decisions`));
    return arrayFromResponse(await this.auth.get<unknown>(`/protokolle/${encodeURIComponent(id)}/beschluesse`));
  }

  async listRelevantDecisions(): Promise<unknown[]> {
    if (this.isV2()) return this.listV2Decisions();
    return arrayFromResponse(await this.auth.get<unknown>('/protokolle/beschluesse'));
  }

  async getDueDecisions(): Promise<unknown[]> {
    if (this.isV2()) return [];
    return arrayFromResponse(await this.auth.get<unknown>('/protokolle/beschluesse/faellig'));
  }

  async getOverdueDecisions(): Promise<unknown[]> {
    if (this.isV2()) return [];
    return arrayFromResponse(await this.auth.get<unknown>('/protokolle/beschluesse/ueberfaellig'));
  }

  async getDecisionStatistics(): Promise<unknown | null> {
    if (this.isV2()) return null;
    return await this.auth.get<unknown | null>('/protokolle/beschluesse/statistik');
  }

  async getExtendedDecisionStatistics(): Promise<unknown | null> {
    if (this.isV2()) return null;
    return await this.auth.get<unknown | null>('/protokolle/beschluesse/statistik-extended');
  }

  async searchDecisions(query: string): Promise<unknown[]> {
    if (this.isV2()) return (await this.listV2Decisions()).filter((decision) => textMatchesQuery(decision, query));
    return arrayFromResponse(await this.auth.get<unknown>('/search', {
      query: { q: query, types: ['beschluss', 'protokoll'], limit: 20 },
    }));
  }

  async suggestForInlineCommand(q: string): Promise<unknown[]> {
    if (this.isV2()) return (await this.searchDecisions(q)).slice(0, 10);
    return arrayFromResponse(await this.auth.get<unknown>('/search/suggest', {
      query: { q, types: ['beschluss'], limit: 10 },
    }));
  }

  private isV2(): boolean {
    return this.auth.getReadContext().apiMode === 'gremia_br_v2';
  }

  private selectedV2BodyId(): string {
    const bodyId = this.auth.getReadContext().selectedBodyId?.trim();
    if (!bodyId) throw new Error('Bitte zuerst in den Einstellungen ein berechtigtes SBV-Gremium aus Gremia.BR auswählen.');
    return bodyId;
  }

  private async listV2BodyMeetings(): Promise<unknown[]> {
    this.v2MeetingCache ??= this.loadV2BodyMeetings();
    return this.v2MeetingCache;
  }

  private async loadV2BodyMeetings(): Promise<unknown[]> {
    const bodyId = this.selectedV2BodyId();
    return arrayFromResponse(await this.auth.get<unknown>(`/api/v1/bodies/${encodeURIComponent(bodyId)}/meetings`));
  }

  private async listV2Decisions(): Promise<unknown[]> {
    this.v2DecisionCache ??= this.loadV2Decisions();
    return this.v2DecisionCache;
  }

  private async loadV2Decisions(): Promise<unknown[]> {
    const meetingIds = (await this.listV2BodyMeetings())
      .map((meeting) => idFromItem(meeting))
      .filter((id): id is string => Boolean(id))
      .slice(0, 12);
    const decisions: unknown[] = [];
    for (const meetingId of meetingIds) {
      decisions.push(...arrayFromResponse(await this.auth.get<unknown>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/decisions`)));
    }
    return decisions;
  }
}
