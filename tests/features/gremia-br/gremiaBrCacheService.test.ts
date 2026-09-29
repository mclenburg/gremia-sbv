import { describe, expect, it } from 'vitest';
import { GremiaBrCacheService } from '../../../services/gremiaBr/gremiaBrCacheService';
import type { GremiaBrReadAdapter } from '../../../services/gremiaBr/gremiaBrTypes';

class FakeReadAdapter implements GremiaBrReadAdapter {
  calls: string[] = [];

  async listAccessibleCases() {
    this.calls.push('accessible-cases');
    return [{ id: 'case-1', reference: 'BR-2026-17', subject: 'Arbeitsplatzgestaltung', procedureIds: ['procedure-1'] }];
  }

  async listOwnTasks() {
    this.calls.push('own-tasks');
    return [{ id: 'task-1', title: 'Stellungnahme prüfen', status: 'OPEN' as const, dueAt: '2026-10-01T10:00:00.000Z' }];
  }

  async listOwnPendingAccessApprovals() {
    this.calls.push('own-access-approvals');
    return [{ id: 'approval-1', resourceType: 'DOCUMENT', status: 'PENDING' as const, requestedAt: '2026-10-01T10:00:00.000Z' }];
  }

  async listWorksAgreements(): Promise<unknown[]> { return []; }
  async listRelevantMeetings(): Promise<unknown[]> { return this.getUpcomingMeetings(); }
  async getReferenceById(_id: string): Promise<unknown | null> { return null; }
  async searchDecisions(_query: string): Promise<unknown[]> { return []; }
  async getDecisionStatistics(): Promise<unknown | null> {
    this.calls.push('stats');
    return { offen: 1 };
  }
  async getExtendedDecisionStatistics(): Promise<unknown | null> {
    this.calls.push('extended-stats');
    return { offen: 1, faellig: 1 };
  }
  async suggestForInlineCommand(_q: string): Promise<unknown[]> { return []; }

  async getNextMeeting(): Promise<unknown | null> {
    this.calls.push('next');
    return { id: 's1', titel: 'Nächste BR-Sitzung' };
  }

  async getCurrentMeeting(): Promise<unknown | null> {
    this.calls.push('current');
    return { id: 's0', titel: 'Aktuelle BR-Sitzung' };
  }

  async getUpcomingMeetings(): Promise<unknown[]> {
    this.calls.push('upcoming');
    return [{ id: 's1' }, { id: 's2' }];
  }

  async getPendingFollowUps(): Promise<unknown[]> {
    this.calls.push('followups');
    return [{ id: 'w1', titel: 'Wiedervorlage BEM' }];
  }

  async getMeetingById(): Promise<unknown | null> { return null; }
  async getMeetingAgenda(id: string): Promise<unknown[]> {
    this.calls.push(`agenda:${id}`);
    return id === 's1' ? [{ titel: 'BEM und Arbeitsplatzgestaltung' }] : [];
  }

  async getMeetingProtocolStatus(): Promise<unknown | null> { return null; }
  async listProtocols(): Promise<unknown[]> { return []; }
  async getProtocolById(): Promise<unknown | null> { return null; }
  async getProtocolByMeeting(): Promise<unknown | null> { return null; }
  async listProtocolDecisions(): Promise<unknown[]> { return []; }
  async listRelevantDecisions(): Promise<unknown[]> {
    this.calls.push('decisions');
    return [{ id: 'b1', titel: 'BEM-Beschluss' }];
  }

  async getDueDecisions(): Promise<unknown[]> {
    this.calls.push('due');
    return [{ id: 'b2', titel: 'Fälliger Beschluss' }];
  }

  async getOverdueDecisions(): Promise<unknown[]> {
    this.calls.push('overdue');
    return [{ id: 'b3', titel: 'Überfälliger Beschluss' }];
  }
}

describe('Gremia.BR Remote-Arbeitsstand', () => {
  it('aktualisiert den flüchtigen Arbeitsstand nur über den explizit aufgerufenen ReadAdapter', async () => {
    const adapter = new FakeReadAdapter();
    const service = new GremiaBrCacheService();

    const result = await service.refresh(adapter);

    expect(result.status).toBe('ok');
    expect(result.refreshedKeys).toEqual(['accessible_cases', 'own_tasks', 'own_access_approvals', 'next_meeting', 'current_meeting', 'upcoming_meetings', 'meeting_agendas', 'pending_follow_ups', 'decisions', 'due_decisions', 'overdue_decisions', 'decision_statistics', 'extended_decision_statistics']);
    expect(adapter.calls).toEqual(['accessible-cases', 'own-tasks', 'own-access-approvals', 'next', 'current', 'upcoming', 'followups', 'agenda:s1', 'agenda:s0', 'agenda:s2', 'decisions', 'due', 'overdue', 'stats', 'extended-stats']);
    expect(result.cached.accessibleCases).toMatchObject([{ id: 'case-1', procedureIds: ['procedure-1'] }]);
    expect(result.cached.ownTasks).toMatchObject([{ id: 'task-1', title: 'Stellungnahme prüfen' }]);
    expect(result.cached.ownAccessApprovals).toMatchObject([{ id: 'approval-1', status: 'PENDING' }]);
    expect(result.cached.nextMeeting).toMatchObject({ id: 's1' });
    expect(result.cached.currentMeeting).toMatchObject({ id: 's0' });
    expect(result.cached.upcomingMeetings).toHaveLength(2);
    expect(result.cached.meetingAgendas.s1).toHaveLength(1);
    expect(result.cached.pendingFollowUps).toHaveLength(1);
    expect(result.cached.decisions).toHaveLength(1);
    expect(result.cached.dueDecisions).toHaveLength(1);
    expect(result.cached.overdueDecisions).toHaveLength(1);
    expect(result.cached.decisionStatistics).toMatchObject({ offen: 1 });
  });

  it('behält bei einem fehlgeschlagenen Gesamt-Refresh den vorherigen Stand vollständig', async () => {
    const service = new GremiaBrCacheService();
    await service.refresh(new FakeReadAdapter());
    const previous = service.getOverview();
    const failing = new FakeReadAdapter();
    failing.getDueDecisions = async () => { throw new Error('Abruf fehlgeschlagen'); };

    await expect(service.refresh(failing)).rejects.toThrow('Abruf fehlgeschlagen');
    expect(service.getOverview()).toEqual(previous);
  });

  it('hält Remote-Inhalte nur für die Lebensdauer des Service im Speicher', async () => {
    const service = new GremiaBrCacheService();
    await service.refresh(new FakeReadAdapter());
    expect(service.getOverview().decisions).toHaveLength(1);
    expect(new GremiaBrCacheService().getOverview().decisions).toEqual([]);

    service.clear();
    expect(service.getOverview().decisions).toEqual([]);
  });
});
