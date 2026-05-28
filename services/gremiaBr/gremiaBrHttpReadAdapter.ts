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

export class GremiaBrHttpReadAdapter implements GremiaBrReadAdapter {
  constructor(private readonly auth: GremiaBrAuthService) {}

  async listWorksAgreements(): Promise<unknown[]> { return []; }
  async getReferenceById(id: string): Promise<unknown | null> { return this.getDecisionById(id); }

  async getDecisionById(id: string): Promise<unknown | null> {
    const results = arrayFromResponse(await this.auth.get<unknown>('/search', {
      query: { q: id, types: ['beschluss'], limit: 1 },
    }));
    return results[0] ?? null;
  }

  async listRelevantMeetings(): Promise<unknown[]> {
    return this.getUpcomingMeetings();
  }

  async getNextMeeting(): Promise<unknown | null> {
    return await this.auth.get<unknown | null>('/sitzungen/naechste');
  }

  async getCurrentMeeting(): Promise<unknown | null> {
    return await this.auth.get<unknown | null>('/sitzungen/aktuelle');
  }

  async getUpcomingMeetings(): Promise<unknown[]> {
    return arrayFromResponse(await this.auth.get<unknown>('/sitzungen/kommende'));
  }

  async getPendingFollowUps(date?: string): Promise<unknown[]> {
    return arrayFromResponse(await this.auth.get<unknown>('/sitzungen/wiedervorlagen', {
      query: { datum: date },
    }));
  }

  async getMeetingById(id: string): Promise<unknown | null> {
    return await this.auth.get<unknown | null>(`/sitzungen/${encodeURIComponent(id)}`);
  }

  async getMeetingAgenda(id: string): Promise<unknown[]> {
    return arrayFromResponse(await this.auth.get<unknown>(`/sitzungen/${encodeURIComponent(id)}/agenda`));
  }

  async getMeetingProtocolStatus(id: string): Promise<unknown | null> {
    return await this.auth.get<unknown | null>(`/sitzungen/${encodeURIComponent(id)}/protokoll-status`);
  }

  async listProtocols(): Promise<unknown[]> {
    return arrayFromResponse(await this.auth.get<unknown>('/protokolle'));
  }

  async getProtocolById(id: string): Promise<unknown | null> {
    return await this.auth.get<unknown | null>(`/protokolle/${encodeURIComponent(id)}`);
  }

  async getProtocolByMeeting(sitzungId: string): Promise<unknown | null> {
    return await this.auth.get<unknown | null>(`/protokolle/sitzung/${encodeURIComponent(sitzungId)}`);
  }

  async listProtocolDecisions(id: string): Promise<unknown[]> {
    return arrayFromResponse(await this.auth.get<unknown>(`/protokolle/${encodeURIComponent(id)}/beschluesse`));
  }

  async listRelevantDecisions(): Promise<unknown[]> {
    return arrayFromResponse(await this.auth.get<unknown>('/protokolle/beschluesse'));
  }

  async getDueDecisions(): Promise<unknown[]> {
    return arrayFromResponse(await this.auth.get<unknown>('/protokolle/beschluesse/faellig'));
  }

  async getOverdueDecisions(): Promise<unknown[]> {
    return arrayFromResponse(await this.auth.get<unknown>('/protokolle/beschluesse/ueberfaellig'));
  }

  async getDecisionStatistics(): Promise<unknown | null> {
    return await this.auth.get<unknown | null>('/protokolle/beschluesse/statistik');
  }

  async getExtendedDecisionStatistics(): Promise<unknown | null> {
    return await this.auth.get<unknown | null>('/protokolle/beschluesse/statistik-extended');
  }

  async searchDecisions(query: string): Promise<unknown[]> {
    return arrayFromResponse(await this.auth.get<unknown>('/search', {
      query: { q: query, types: ['beschluss', 'protokoll'], limit: 20 },
    }));
  }

  async suggestForInlineCommand(q: string): Promise<unknown[]> {
    return arrayFromResponse(await this.auth.get<unknown>('/search/suggest', {
      query: { q, types: ['beschluss'], limit: 10 },
    }));
  }
}
