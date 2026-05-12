import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('case measure note privacy wiring', () => {
  it('includes measure notes in anonymization marker replacement', () => {
    const source = readFileSync('services/privacyReviewService.ts', 'utf8');
    expect(source).toContain("'case_measure_notes'");
    expect(source).toContain("['title', 'participants', 'content', 'next_steps']");
  });

  it('uses text-command enabled fields in the measure note form', () => {
    const source = readFileSync('src/app/features/cases/measures/MeasureNotesPanel.tsx', 'utf8');
    expect(source.match(/<TextCommandTextarea/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(source).toContain('fieldId={`${fieldPrefix}-content`}');
    expect(source).toContain('fieldId={`${fieldPrefix}-next`}');
  });
});
