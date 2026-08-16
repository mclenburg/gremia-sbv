import { describe, expect, it } from 'vitest';
import { defaultEmployerResponseDueAt, preventionReviewDueAtAfterEmployerDeadline } from '../../../services/preventionWorkflowPolicy';

describe('Präventionsfristen – Verhalten', () => {
  it('legt die automatische Präventionsprüfung einen Tag nach der Arbeitgeberfrist an', () => {
    const employerDueAt = defaultEmployerResponseDueAt('2026-05-02T09:00:00.000Z');

    expect(employerDueAt).toBe('2026-05-09T09:00:00.000Z');
    expect(preventionReviewDueAtAfterEmployerDeadline(employerDueAt)).toBe('2026-05-10T09:00:00.000Z');
  });
});
