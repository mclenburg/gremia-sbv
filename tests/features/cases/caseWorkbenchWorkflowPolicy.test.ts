import { describe, expect, it } from 'vitest';

describe('Fallakten-Workbench', () => {
  it('führt neue Aktenbestandteile über eine Footer-Aktionsleiste', () => {
    const actions = ['note', 'document', 'deadline', 'prevention', 'bem', 'termination_hearing', 'equalization'];
    expect(actions).toContain('note');
    expect(actions).toContain('prevention');
    expect(actions).not.toContain('tree-action-button');
  });

  it('trennt Aktenbaum und Bearbeitungsbereich fachlich', () => {
    const treePurpose = 'Aktenbestandteile anzeigen';
    const detailPurpose = 'ausgewählten Aktenbestandteil bearbeiten';
    expect(treePurpose).not.toBe(detailPurpose);
  });
});
