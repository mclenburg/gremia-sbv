import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { RecruitingParticipationsView } from '../src/app/features/recruiting/RecruitingParticipationsView';
import { recruitingStatusLabels, getRecruitingRiskHints } from '../src/app/features/recruiting/recruitingViewLogic';
import type { RecruitingParticipationRecord } from '../src/app/core/models/recruiting-participation.model';
import { ACTIVITY_JOURNAL_CONTEXT_TYPES, ACTIVITY_JOURNAL_TARGET_TYPES } from '../src/app/core/models/activity-journal.model';
import { DEADLINE_PROCESS_TYPES } from '../src/app/core/models/deadline.model';
import { buildFromContext } from '../services/activityJournalPrefill';
import { LiveRegionProvider } from '../src/app/shared/a11y/LiveRegionProvider';
import { renderElement, visibleText } from './helpers/renderedMarkup';

function recruitingRecord(overrides: Partial<RecruitingParticipationRecord> = {}): RecruitingParticipationRecord {
  return {
    id: 'recruiting-1',
    vacancyTitle: 'Senior Systemadministrator:in',
    status: 'interviews_completed',
    documentsComplete: false,
    hasSeverelyDisabledApplicants: true,
    interviewCount: 1,
    decisionBeforeHearing: false,
    flaggedForViolationReview: false,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('Stellenbesetzungen 0.9.5-b UI- und Kontextintegration', () => {
  it('registriert Stellenbesetzung und Vorstellungsgespräch als Journal-Kontexte und Deadline-Prozess', () => {
    expect(ACTIVITY_JOURNAL_TARGET_TYPES).toContain('recruiting_participation');
    expect(ACTIVITY_JOURNAL_TARGET_TYPES).toContain('recruiting_interview');
    expect(ACTIVITY_JOURNAL_CONTEXT_TYPES).toContain('recruiting_participation');
    expect(ACTIVITY_JOURNAL_CONTEXT_TYPES).toContain('recruiting_interview');
    expect(DEADLINE_PROCESS_TYPES).toContain('recruiting_participation');

    const prefill = buildFromContext({ contextType: 'recruiting_participation', contextId: 'recruiting-1', title: 'Stelle IT-1' });
    expect(prefill.entry.category).toBe('participation');
    expect(prefill.entry.links).toEqual([{ targetType: 'recruiting_participation', targetId: 'recruiting-1' }]);
  });

  it('benennt die zentrale Nachhaltung ohne Gesprächsprotokoll', () => {
    const { markup } = renderElement(createElement(LiveRegionProvider, {
      children: createElement(RecruitingParticipationsView, { onCreateDeadline: async () => undefined }),
    }));
    const text = visibleText(markup);

    expect(text).toContain('Stellenbesetzungen');
    expect(text).toContain('kein Gesprächsprotokoll');
    expect(text).toContain('Anhörung offen');
    expect(text).toContain('Unterlagen offen');
    expect(text).toContain('Verstoßprüfung');
    expect(text).toContain('Stelle / Bezeichnung');
  });

  it('liefert Prüfhinweise für offene Anhörung und unvollständige Unterlagen', () => {
    expect(recruitingStatusLabels.hearing_pending).toBe('Anhörung offen');
    expect(getRecruitingRiskHints(recruitingRecord())).toEqual([
      'Unterlagen unvollständig',
      'Anhörung vor Auswahlentscheidung offen',
    ]);
  });
});
