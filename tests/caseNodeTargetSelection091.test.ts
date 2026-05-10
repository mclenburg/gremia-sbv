import { describe, expect, it } from 'vitest';
import { selectionForCaseNodeTarget, shouldAutoSelectFirstCase } from '../src/app/features/cases/caseNodeTargetSelection';

describe('case node deep link selection', () => {
  it('does not auto-select the first case while a deep-link target is pending', () => {
    expect(shouldAutoSelectFirstCase({ selectedCaseId: '', hasCases: true, hasTarget: true, hasPendingTarget: false })).toBe(false);
    expect(shouldAutoSelectFirstCase({ selectedCaseId: '', hasCases: true, hasTarget: false, hasPendingTarget: true })).toBe(false);
    expect(shouldAutoSelectFirstCase({ selectedCaseId: '', hasCases: true, hasTarget: false, hasPendingTarget: false })).toBe(true);
  });

  it.each([
    ['bem', { type: 'process', processType: 'bem', id: 'bem-1' }],
    ['prevention', { type: 'process', processType: 'prevention', id: 'prevention-1' }],
    ['participation', { type: 'process', processType: 'participation', id: 'participation-1' }],
    ['workplace_accommodation', { type: 'process', processType: 'workplace_accommodation', id: 'workplace_accommodation-1' }],
    ['equalization', { type: 'process', processType: 'equalization', id: 'equalization-1' }],
    ['termination_hearing', { type: 'process', processType: 'termination_hearing', id: 'termination_hearing-1' }]
  ] as const)('maps %s targets to process selection', (nodeType, expected) => {
    expect(selectionForCaseNodeTarget({ caseId: 'case-2', nodeType, nodeId: `${nodeType}-1` }, 'case-2')).toEqual(expected);
  });

  it('falls back to overview if the target belongs to another case', () => {
    expect(selectionForCaseNodeTarget({ caseId: 'case-2', nodeType: 'bem', nodeId: 'bem-1' }, 'case-1')).toEqual({ type: 'overview' });
  });
});
