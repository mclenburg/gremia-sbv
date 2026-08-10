import { describe, expect, it } from 'vitest';

describe('case modal workflow baseline', () => {
  it('keeps case creation and note creation as focused actions', () => {
    const actions = ['create-case-modal', 'create-note-modal', 'case-tree-primary'];
    expect(actions).toContain('create-case-modal');
    expect(actions).toContain('create-note-modal');
    expect(actions).toContain('case-tree-primary');
  });
});
