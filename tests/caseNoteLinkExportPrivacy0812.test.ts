import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('0.8.12 case note link privacy', () => {
  it('stores labels separately and keeps audit metadata sparse without freetext', () => {
    const service = readFileSync('services/caseService.ts', 'utf8');
    expect(service).toContain('replaceNoteEntityLinks');
    expect(service).toContain('label TEXT NOT NULL');
    expect(service).toContain("subjectType: 'case_note_link'");
    expect(service).toContain('targetType: link.targetType');
    expect(service).not.toContain('metadata: { content');
    expect(service).not.toContain('metadata: { nextSteps');
  });
});
