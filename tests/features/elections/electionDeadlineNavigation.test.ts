import { describe, expect, it } from 'vitest';
import { sectionForDeadline } from '../../../src/app/features/elections/ElectionWorkbench';

describe('Wahlfristen-Navigation', () => {
  it('öffnet den passenden Wahl-Arbeitsbereich anhand des Fristursprungs', () => {
    expect(sectionForDeadline('formal.voterlist.objection')).toBe('voters');
    expect(sectionForDeadline('formal.proposal.submit')).toBe('nominations');
    expect(sectionForDeadline('formal.board.appoint')).toBe('body');
    expect(sectionForDeadline('formal.notice.publish')).toBe('documents');
    expect(sectionForDeadline('simplified.invitation')).toBe('setup');
  });
});
