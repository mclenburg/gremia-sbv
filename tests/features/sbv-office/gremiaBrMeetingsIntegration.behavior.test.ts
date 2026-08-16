import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildBrMeetingDrafts, filterMeetings, meetingPageCount, pageMeetings } from '../../../src/app/features/sbv-control/components/MeetingsWorkspace';
import { openTestDatabase } from '../../helpers/openTestDatabase';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { SbvMeetingService } from '../../../services/sbvMeetingService';
import { isLazyFeatureView } from '../../../src/app/core/loading/lazyFeatureViews';
import { modules } from '../../../src/app/core/navigation/modules';

describe('Gremiensitzungen als direkter SBV-Arbeitsbereich', () => {
  it('führt Sitzungen als eigenen Hauptnavigationseinstieg und lädt denselben produktiven Gremien-Workbench', () => {
    expect(modules.find((module) => module.id === 'meetings')).toMatchObject({ shortTitle: 'Sitzungen', group: 'core' });
    expect(isLazyFeatureView('meetings')).toBe(true);
    expect(isLazyFeatureView('elections')).toBe(true);
  });

  it('übernimmt Gremia.BR-Sitzungen dedupliziert mit Tagesordnung als neutrale SBV-Arbeitskopie', () => {
    const overview = {
      currentMeeting: { id: 'br-1', titel: 'BR-Sitzung August', datum: '2026-08-20T09:00:00.000Z', ort: 'Raum 2' },
      nextMeeting: { id: 'br-1', titel: 'BR-Sitzung August', datum: '2026-08-20T09:00:00.000Z' },
      upcomingMeetings: [{ id: 'br-2', title: 'Ausschusssitzung', date: '2026-08-24T12:00:00.000Z' }],
      meetingAgendas: {
        'br-1': [{ titel: 'TOP 1 Personal' }, { title: 'TOP 2 Organisation' }],
        'br-2': [{ name: 'Bericht' }],
      },
      pendingFollowUps: [], decisions: [], dueDecisions: [], overdueDecisions: [],
    };

    expect(buildBrMeetingDrafts(overview)).toEqual([
      { sourceId: 'br-1', title: 'BR-Sitzung August', startsAt: '2026-08-20T09:00:00.000Z', location: 'Raum 2', agenda: ['TOP 1 Personal', 'TOP 2 Organisation'] },
      { sourceId: 'br-2', title: 'Ausschusssitzung', startsAt: '2026-08-24T12:00:00.000Z', location: undefined, agenda: ['Bericht'] },
    ]);
  });
});


describe('Sitzungsregister und Tagesordnung', () => {
  it('sortiert absteigend, filtert und paginiert mit maximal fünf Sitzungen', () => {
    const records = Array.from({ length: 12 }, (_, index) => ({
      id: `m-${index}`,
      meetingType: index % 2 ? 'works_council' : 'health_safety',
      title: index === 3 ? 'Budget und Personal' : `Sitzung ${index}`,
      startsAt: new Date(Date.UTC(2026, 7, index + 1, 10)).toISOString(),
      attendanceStatus: '', status: 'planned', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', agenda: [],
    })) as import('../../../src/app/core/models/sbv-office-workflow.model').SbvMeetingRecord[];

    const sorted = filterMeetings(records, '');
    expect(sorted[0]?.id).toBe('m-11');
    expect(sorted.at(-1)?.id).toBe('m-0');
    expect(meetingPageCount(sorted.length)).toBe(3);
    expect(pageMeetings(sorted, 1)).toHaveLength(5);
    expect(pageMeetings(sorted, 3)).toHaveLength(2);
    expect(filterMeetings(records, 'Budget')).toHaveLength(1);
    expect(filterMeetings(records, 'Arbeitsschutzausschuss')).toHaveLength(6);
    expect(filterMeetings(records, '04.08.2026')).toHaveLength(1);
  });

  describe('TOP anlegen', () => {
    let db: DatabaseAdapter;

    beforeEach(async () => {
      db = await openTestDatabase();
      db.exec(`
        CREATE TABLE sbv_meetings (
          id TEXT PRIMARY KEY, meeting_type TEXT NOT NULL, title TEXT NOT NULL, starts_at TEXT NOT NULL,
          location TEXT, invitation_received_at TEXT, agenda_received_at TEXT, attendance_status TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'draft', notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE sbv_meeting_agenda_items (
          id TEXT PRIMARY KEY, meeting_id TEXT NOT NULL REFERENCES sbv_meetings(id) ON DELETE CASCADE,
          position INTEGER NOT NULL DEFAULT 0, title TEXT NOT NULL, sbv_relevance INTEGER NOT NULL DEFAULT 0,
          reference_scope TEXT NOT NULL DEFAULT 'none', documents_status TEXT, own_position TEXT,
          requested_by_sbv INTEGER NOT NULL DEFAULT 0, request_at TEXT, request_content TEXT, request_reaction TEXT,
          resolution_at TEXT, resolution_summary TEXT, impairment_assessment TEXT, significant_impairment INTEGER NOT NULL DEFAULT 0,
          non_participation INTEGER NOT NULL DEFAULT 0, suspension_requested_at TEXT, suspension_due_at TEXT, outcome TEXT,
          status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
      `);
    });

    afterEach(() => db.close());

    it('persistiert einen neuen TOP und liefert ihn direkt an die Oberfläche zurück', () => {
      const service = new SbvMeetingService(db);
      const meeting = service.create({ meetingType: 'works_council', title: 'BR-Sitzung', startsAt: '2026-08-20T09:00:00.000Z' });
      const agenda = service.upsertAgenda(meeting.id, { title: 'Arbeitsorganisation', sbvRelevance: true });

      expect(agenda).toMatchObject({ meetingId: meeting.id, title: 'Arbeitsorganisation', position: 1, sbvRelevance: true });
      expect(service.list()[0]?.agenda).toHaveLength(1);
      expect(service.list()[0]?.agenda[0]?.id).toBe(agenda.id);
    });
  });
});
