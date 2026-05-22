import type { GremiaBrReadAdapter } from './gremiaBrTypes.js';

export class NoopGremiaBrReadAdapter implements GremiaBrReadAdapter {
  async listWorksAgreements(): Promise<unknown[]> { return []; }
  async listRelevantMeetings(): Promise<unknown[]> { return []; }
  async getReferenceById(_id: string): Promise<unknown | null> { return null; }
  async getDecisionById(_id: string): Promise<unknown | null> { return null; }
  async getNextMeeting(): Promise<unknown | null> { return null; }
  async getUpcomingMeetings(): Promise<unknown[]> { return []; }
  async getMeetingAgenda(_id: string): Promise<unknown[]> { return []; }
  async listRelevantDecisions(): Promise<unknown[]> { return []; }
  async getDueDecisions(): Promise<unknown[]> { return []; }
  async getOverdueDecisions(): Promise<unknown[]> { return []; }
  async searchDecisions(_query: string): Promise<unknown[]> { return []; }
  async suggestForInlineCommand(_q: string): Promise<unknown[]> { return []; }
}
