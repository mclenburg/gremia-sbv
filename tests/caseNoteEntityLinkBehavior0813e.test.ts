import { describe, expect, it } from 'vitest';
import {
  selectionForLink,
  typeLabel,
} from '../src/app/features/cases/CaseNoteEntityLinks';
import type { CaseNoteLinkRecord, CaseNoteLinkTargetType } from '../src/app/core/models/case-note-link.model';

function link(targetType: CaseNoteLinkTargetType): CaseNoteLinkRecord {
  return {
    id: `link-${targetType}`,
    caseNoteId: 'note-1',
    targetType,
    targetId: `target-${targetType}`,
    caseId: 'case-1',
    label: `Fachlicher Bezug ${targetType}`,
    accessibleLabel: `Öffnen ${targetType}`,
    textStart: 0,
    textEnd: 12,
    createdAt: '2026-05-07T08:00:00.000Z',
  };
}

describe('case note entity link behavior', () => {
  it.each([
    ['bem', 'bem', 'BEM'],
    ['prevention', 'prevention', 'Prävention'],
    ['participation', 'participation', 'SBV-Beteiligung'],
    ['termination_hearing', 'termination_hearing', 'Kündigungsanhörung'],
    ['equalization', 'equalization', 'Gleichstellung/GdB'],
    ['workplace_accommodation', 'workplace_accommodation', 'Arbeitsplatzanpassung'],
  ] as const)('maps %s links to the expected case-explorer process selection', (targetType, processType, label) => {
    const record = link(targetType);

    expect(selectionForLink(record)).toEqual({
      type: 'process',
      processType,
      id: record.targetId,
    });
    expect(typeLabel(record)).toBe(label);
  });

  it('does not navigate deadlines as process links and still labels them fachlich', () => {
    const deadline = link('deadline');

    expect(selectionForLink(deadline)).toBeNull();
    expect(typeLabel(deadline)).toBe('Frist');
  });

  it('uses the persisted target id only for navigation, not as the visible label', () => {
    const record = link('prevention');

    const selection = selectionForLink(record);

    expect(selection).not.toBeNull();
    if (selection?.type !== 'process') {
      throw new Error('Expected process selection for prevention link');
    }
    expect(selection.id).toBe(record.targetId);
    expect(record.label).not.toBe(record.targetId);
    expect(record.accessibleLabel).not.toContain(record.targetId);
  });
});
