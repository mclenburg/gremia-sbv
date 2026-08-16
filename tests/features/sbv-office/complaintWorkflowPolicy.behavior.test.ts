import { describe, expect, it } from 'vitest';
import { QUICK_CASE_TEMPLATES, complaintCanClose } from '../../../services/complaintWorkflowPolicy';

describe('complaint workflow policy', () => {
  it('offers the seven scoped quick-case work structures without deciding a case outcome', () => {
    expect(QUICK_CASE_TEMPLATES.map((item) => item.key)).toEqual([
      'additional_leave', 'overtime', 'qualification', 'working_time', 'part_time', 'discrimination_agg', 'assistive_device',
    ]);
    expect(QUICK_CASE_TEMPLATES.every((item) => item.checklist.length > 0)).toBe(true);
  });

  it('requires both a result and feedback to the affected person before closing', () => {
    expect(complaintCanClose({ resultSummary: 'Ergebnis', personInformedAt: undefined })).toBe(false);
    expect(complaintCanClose({ resultSummary: 'Ergebnis', personInformedAt: '2026-08-16T09:00:00.000Z' })).toBe(true);
  });
});
