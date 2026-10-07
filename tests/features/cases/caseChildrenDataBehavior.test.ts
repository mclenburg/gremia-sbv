import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForBridge } from '../../../src/app/core/bridge/waitForBridge';
import { caseChildrenReducer, emptyCaseChildren, loadCaseChildren } from '../../../src/app/features/cases/caseChildrenData';

vi.mock('../../../src/app/core/bridge/waitForBridge', () => ({ waitForBridge: vi.fn() }));

function setup() {
  const service = (id: string) => vi.fn().mockResolvedValue([{ id, caseId: 'case-1' }]);
  const bridge = {
    cases: { listNotes: service('note-1'), listDocuments: service('document-1') },
    knowledge: { listCaseReferences: service('norm-1') },
    prevention: { list: service('prevention-1') }, bem: { list: service('bem-1') },
    equalization: { list: service('equalization-1') }, termination: { list: service('termination-1') },
    participation: { list: service('participation-1') }, workplaceAccommodation: { list: service('workplace-1') },
  };
  vi.mocked(waitForBridge).mockResolvedValue(bridge as unknown as NonNullable<Window['gremiaSbv']>);
  return bridge;
}

describe('case children data behavior', () => {
  afterEach(() => vi.resetAllMocks());

  it('loads every child family within the requested case and keeps their results separate', async () => {
    const bridge = setup();
    const loaded = await loadCaseChildren('case-1');
    expect(loaded).toEqual({
      notes: [{ id: 'note-1', caseId: 'case-1' }], documents: [{ id: 'document-1', caseId: 'case-1' }],
      caseLegalReferences: [{ id: 'norm-1', caseId: 'case-1' }], casePreventionProcesses: [{ id: 'prevention-1', caseId: 'case-1' }],
      caseBemProcesses: [{ id: 'bem-1', caseId: 'case-1' }], caseEqualizationProcesses: [{ id: 'equalization-1', caseId: 'case-1' }],
      caseTerminationProcesses: [{ id: 'termination-1', caseId: 'case-1' }], caseParticipationProcesses: [{ id: 'participation-1', caseId: 'case-1' }],
      caseWorkplaceAccommodationProcesses: [{ id: 'workplace-1', caseId: 'case-1' }],
    });
    for (const list of [bridge.cases.listNotes, bridge.cases.listDocuments, bridge.knowledge.listCaseReferences,
      bridge.prevention.list, bridge.bem.list, bridge.equalization.list, bridge.termination.list,
      bridge.participation.list, bridge.workplaceAccommodation.list]) {
      expect(list).toHaveBeenCalledExactlyOnceWith('case-1');
    }
  });

  it('returns empty optional families when only the case service is available', async () => {
    const bridge = setup();
    bridge.cases.listNotes.mockResolvedValue([]);
    bridge.cases.listDocuments.mockResolvedValue([]);
    vi.mocked(waitForBridge).mockResolvedValue({ cases: bridge.cases } as unknown as NonNullable<Window['gremiaSbv']>);
    expect(await loadCaseChildren('case-1')).toEqual(emptyCaseChildren());
  });

  it('rejects a failed child request without publishing a partially loaded snapshot', async () => {
    const bridge = setup();
    bridge.bem.list.mockRejectedValue(new Error('BEM nicht verfügbar'));
    await expect(loadCaseChildren('case-1')).rejects.toThrow('BEM nicht verfügbar');
  });

  it('does not publish data until all requested families have arrived', async () => {
    const bridge = setup();
    let complete!: (rows: []) => void;
    bridge.bem.list.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    const publish = vi.fn();
    const pending = loadCaseChildren('case-1').then(publish);
    await vi.waitFor(() => expect(bridge.workplaceAccommodation.list).toHaveBeenCalled());
    expect(publish).not.toHaveBeenCalled();
    complete([]);
    await pending;
    expect(publish).toHaveBeenCalledOnce();
  });

  it('reports an unavailable case service', async () => {
    vi.mocked(waitForBridge).mockResolvedValue(null);
    await expect(loadCaseChildren('case-1')).rejects.toThrow('Falldienst ist nicht erreichbar.');
  });

  it('replaces every family together and clears all records when leaving a case', async () => {
    setup();
    const loaded = await loadCaseChildren('case-1');
    const state = caseChildrenReducer(emptyCaseChildren(), { type: 'loaded', children: loaded });
    expect(state).toEqual(loaded);
    expect(caseChildrenReducer(state, { type: 'clear' })).toEqual({
      notes: [], documents: [], caseLegalReferences: [], casePreventionProcesses: [], caseBemProcesses: [],
      caseEqualizationProcesses: [], caseTerminationProcesses: [], caseParticipationProcesses: [], caseWorkplaceAccommodationProcesses: [],
    });
    expect(loaded.notes).toHaveLength(1);
  });

  it('supports direct and functional legal-reference updates without discarding other case data', async () => {
    setup();
    const loaded = await loadCaseChildren('case-1');
    const cleared = caseChildrenReducer(loaded, { type: 'legalReferences', update: [] });
    expect(cleared).toEqual({ ...loaded, caseLegalReferences: [] });
    const updated = caseChildrenReducer(cleared, { type: 'legalReferences', update: (current) => [...current, ...loaded.caseLegalReferences] });
    expect(updated).toEqual(loaded);
    expect(cleared.caseLegalReferences).toEqual([]);
  });
});
