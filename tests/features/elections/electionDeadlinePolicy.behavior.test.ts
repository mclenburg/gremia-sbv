import { describe, expect, it } from 'vitest';
import { ElectionDeadlinePolicy, WorkingDayCalendar, addWorkingDays } from '../../../services/electionDeadlinePolicy';

describe('ElectionDeadlinePolicy', () => {
  const policy = new ElectionDeadlinePolicy();

  it('calculates calendar-day rules from the recorded source date', () => {
    expect(policy.calculate('formal.notice.publish', '2026-11-12')).toMatchObject({ sourceDate: '2026-11-12', dueOn: '2026-10-01', originalDueOn: '2026-10-01' });
    expect(policy.calculate('meeting.suspension', '2026-08-14').dueOn).toBe('2026-08-21');
  });

  it('calculates workday rules using weekends and configurable holidays', () => {
    const holidays = new Set(['2026-08-17']);
    const calendar = new WorkingDayCalendar(holidays);
    expect(addWorkingDays('2026-08-14', 3, holidays)).toBe('2026-08-20');
    expect(policy.calculate('result.acceptance', '2026-08-14', { workingDayCalendar: calendar }).dueOn).toBe('2026-08-20');
  });

  it('uses the earlier six-week or term-end bound for the formal target date', () => {
    expect(policy.calculate('formal.election.target', '2026-09-01', { incumbentTermEnd: '2026-10-15' }).dueOn).toBe('2026-10-08');
    expect(policy.calculate('formal.election.target', '2026-07-01', { incumbentTermEnd: '2026-11-30' }).dueOn).toBe('2026-08-12');
  });

  it('preserves the original computed due date when a user corrects it with a reason', () => {
    const computed = policy.calculate('formal.proposal.correction', '2026-08-14');
    const corrected = policy.correct(computed, '2026-08-20', 'Örtlicher Feiertag nachgetragen');
    expect(corrected.originalDueOn).toBe(computed.originalDueOn);
    expect(corrected).toMatchObject({ dueOn: '2026-08-20', manualCorrectionReason: 'Örtlicher Feiertag nachgetragen' });
    expect(() => policy.correct(computed, '2026-08-20', '   ')).toThrow();
  });
});
