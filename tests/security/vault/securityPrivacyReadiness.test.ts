import { describe, expect, it } from 'vitest';
import { normalizeAuditMetadata } from '../../../services/auditHashChain';

describe('audit metadata privacy behavior', () => {
  it('preserves technical references while excluding personal content and unrelated targets', () => {
    const metadataJson = normalizeAuditMetadata({
      subjectId: 'case-note-link-uuid',
      caseId: 'case-uuid',
      action: 'create',
      purpose: 'case_note_link',
      timestamp: '2026-05-11T09:45:00.000Z',
      content: 'Max Mustermann Diagnose Burnout',
      targetType: 'bem',
      targetId: 'bem-uuid',
      email: 'max.mustermann@example.invalid',
    });

    expect(JSON.parse(metadataJson)).toEqual({
      subjectId: 'case-note-link-uuid',
      caseId: 'case-uuid',
      action: 'create',
      purpose: 'case_note_link',
      timestamp: '2026-05-11T09:45:00.000Z',
    });
  });
});
