import { afterEach, describe, expect, it, vi } from 'vitest';
import { createKnowledgeDataActions, createKnowledgeEditActions } from '../../../src/app/features/knowledge/knowledgeActions';
import { SBV_ADVISOR_KNOWLEDGE_ENTRIES } from '../../../src/app/features/knowledge/knowledgeAdvisorData';
import type { CaseRecord } from '../../../src/domain/models/case.model';
import type { LegalNormRecord } from '../../../src/domain/models/knowledge.model';

const norm: LegalNormRecord = {
  id: 'norm-test', source: 'Testquelle', paragraph: '§ 1', title: 'Synthetische Beteiligung', shortText: 'Information und Anhörung',
  tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01',
};
const cases: CaseRecord[] = ['case-1', 'case-2'].map((id) => ({
  id, caseNumber: id, displayName: id, category: 'praevention', status: 'offen', priority: 'normal',
  openedAt: '2024-01-01', isPseudonymized: true, isLocked: false,
}));

function setup(selectedNorm: LegalNormRecord | null = norm, selectedNormId = norm.id) {
  const service = {
    listNorms: vi.fn().mockResolvedValue([norm]),
    listCaseReferences: vi.fn().mockResolvedValue([]),
    listComments: vi.fn().mockResolvedValue([]), listCaseLaw: vi.fn().mockResolvedValue([]), listChecklist: vi.fn().mockResolvedValue([]),
    linkNormToCase: vi.fn().mockResolvedValue(undefined), createComment: vi.fn().mockResolvedValue(undefined),
    createCaseLaw: vi.fn().mockResolvedValue(undefined), createChecklistItem: vi.fn().mockResolvedValue(undefined),
  };
  vi.stubGlobal('window', { gremiaSbv: { security: {}, knowledge: service } });
  const setters = {
    setError: vi.fn(), setMessage: vi.fn(), setAllKnowledgeNorms: vi.fn(), setNorms: vi.fn(), setSelectedNormId: vi.fn(),
    setCaseReferences: vi.fn(), setComments: vi.fn(), setCaseLaw: vi.fn(), setChecklist: vi.fn(),
    setCommentTitle: vi.fn(), setCommentText: vi.fn(), setCaseLawCourt: vi.fn(), setCaseLawFileNumber: vi.fn(),
    setCaseLawHolding: vi.fn(), setChecklistText: vi.fn(),
  };
  const data = createKnowledgeDataActions({ query: '', source: '', selectedNormId, cases, ...setters });
  const loadDetails = vi.fn().mockResolvedValue(undefined);
  const edits = createKnowledgeEditActions({
    selectedNorm: selectedNorm ?? undefined, linkCaseId: 'case-2', commentTitle: 'Mein Kommentar', commentText: 'Fachlicher Inhalt',
    caseLawCourt: 'Testgericht', caseLawFileNumber: '1 AZR 1/24', caseLawHolding: 'Synthetischer Leitsatz',
    checklistText: 'Unterlagen prüfen', checklist: [], loadDetails, ...setters,
  });
  const event = { preventDefault: vi.fn() };
  return { service, setters, data, edits, loadDetails, event };
}

describe('knowledge data and edit workflows', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('filters merged remote and local entries and keeps a selected visible norm', async () => {
    const state = setup();
    await state.data.loadNorms('Anhörung', 'Testquelle');
    expect(state.service.listNorms).toHaveBeenCalledExactlyOnceWith({ limit: 800 });
    expect(state.setters.setNorms).toHaveBeenLastCalledWith([norm]);
    expect(state.setters.setAllKnowledgeNorms).toHaveBeenLastCalledWith(expect.arrayContaining([norm]));
    expect(state.setters.setSelectedNormId).not.toHaveBeenCalled();
  });

  it('replaces a hidden selection and clears it for an empty search result', async () => {
    const state = setup(norm, 'unknown-norm');
    await state.data.loadNorms('', 'Testquelle');
    expect(state.setters.setSelectedNormId).toHaveBeenLastCalledWith(norm.id);
    await state.data.loadNorms('unauffindbar', 'Testquelle');
    expect(state.setters.setSelectedNormId).toHaveBeenLastCalledWith('');
  });

  it('loads the local advisor when the remote service fails and preserves search filters', async () => {
    const state = setup();
    state.service.listNorms.mockRejectedValue(new Error('Lokaler Dienstfehler'));
    await state.data.loadNorms('178', 'SGB IX');
    const rows = state.setters.setNorms.mock.lastCall![0] as LegalNormRecord[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.source === 'SGB IX')).toBe(true);
    expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({ paragraph: '§ 178 Abs. 2 SGB IX' })]));
    expect(state.setters.setAllKnowledgeNorms).toHaveBeenLastCalledWith(SBV_ADVISOR_KNOWLEDGE_ENTRIES);
    expect(state.setters.setError).toHaveBeenLastCalledWith('Lokaler Dienstfehler Lokaler SBV-Ratgeber wurde geladen.');
  });

  it('uses the local advisor without an error when no knowledge service is exposed', async () => {
    const state = setup();
    vi.stubGlobal('window', { gremiaSbv: { security: {} } });
    await state.data.loadNorms('178', 'SGB IX');
    expect(state.setters.setNorms).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ paragraph: '§ 178 Abs. 2 SGB IX' })]));
    expect(state.setters.setError.mock.calls).toEqual([['']]);
  });

  it('collects references only for the selected norm and updates its detail lists', async () => {
    const state = setup();
    const ownReference = { id: 'ref-1', legalNormId: norm.id };
    state.service.listCaseReferences.mockResolvedValueOnce([ownReference]).mockResolvedValueOnce([{ id: 'ref-2', legalNormId: 'other' }]);
    const comment = { id: 'comment-1', legalNormId: norm.id };
    state.service.listComments.mockResolvedValue([comment]);
    await state.data.loadDetails(norm.id);
    expect(state.service.listCaseReferences.mock.calls).toEqual([['case-1'], ['case-2']]);
    expect(state.service.listComments).toHaveBeenCalledExactlyOnceWith(norm.id);
    expect(state.service.listCaseLaw).toHaveBeenCalledExactlyOnceWith(norm.id);
    expect(state.service.listChecklist).toHaveBeenCalledExactlyOnceWith(norm.id);
    expect(state.setters.setCaseReferences).toHaveBeenLastCalledWith([ownReference]);
    expect(state.setters.setComments).toHaveBeenLastCalledWith([comment]);
  });

  it('clears all detail lists for an empty selection without consulting the service', async () => {
    const state = setup();
    await state.data.loadDetails('');
    expect(state.setters.setCaseReferences).toHaveBeenCalledExactlyOnceWith([]);
    expect(state.setters.setComments).toHaveBeenCalledExactlyOnceWith([]);
    expect(state.setters.setCaseLaw).toHaveBeenCalledExactlyOnceWith([]);
    expect(state.setters.setChecklist).toHaveBeenCalledExactlyOnceWith([]);
    expect(state.service.listComments).not.toHaveBeenCalled();
  });

  it('reports a failed detail load without replacing previous confirmed lists', async () => {
    const state = setup();
    state.service.listComments.mockRejectedValue(new Error('Details nicht verfügbar'));
    await state.data.loadDetails(norm.id);
    expect(state.setters.setError).toHaveBeenLastCalledWith('Details nicht verfügbar');
    expect(state.setters.setComments).not.toHaveBeenCalled();
    expect(state.setters.setCaseReferences).not.toHaveBeenCalled();
  });

  it('links the explicit case and norm before refreshing its details', async () => {
    const state = setup();
    await state.edits.linkSelectedNormToCase();
    expect(state.service.linkNormToCase).toHaveBeenCalledExactlyOnceWith({ caseId: 'case-2', legalNormId: norm.id, note: 'Im Wissensmodul verknüpft.' });
    expect(state.loadDetails).toHaveBeenCalledExactlyOnceWith(norm.id);
    expect(state.setters.setMessage).toHaveBeenLastCalledWith('Rechtsbezug § 1 wurde mit der Fallakte verknüpft.');
  });

  it('saves a comment and clears its draft only after confirmation', async () => {
    const state = setup();
    let resolve!: () => void;
    state.service.createComment.mockImplementation(() => new Promise<void>((done) => { resolve = done; }));
    const pending = state.edits.createCommentForNorm(state.event);
    await vi.waitFor(() => expect(state.service.createComment).toHaveBeenCalledOnce());
    expect(state.setters.setCommentTitle).not.toHaveBeenCalled();
    expect(state.loadDetails).not.toHaveBeenCalled();
    resolve();
    await pending;
    expect(state.service.createComment).toHaveBeenCalledExactlyOnceWith({ legalNormId: norm.id, title: 'Mein Kommentar', content: 'Fachlicher Inhalt' });
    expect(state.setters.setCommentTitle).toHaveBeenCalledExactlyOnceWith('');
    expect(state.setters.setCommentText).toHaveBeenCalledExactlyOnceWith('');
    expect(state.loadDetails).toHaveBeenCalledExactlyOnceWith(norm.id);
    expect(state.event.preventDefault).toHaveBeenCalledOnce();
  });

  it('saves court, file number and holding without modifying the other drafts', async () => {
    const state = setup();
    await state.edits.createCaseLawForNorm(state.event);
    expect(state.service.createCaseLaw).toHaveBeenCalledExactlyOnceWith({
      legalNormId: norm.id, court: 'Testgericht', fileNumber: '1 AZR 1/24', shortHolding: 'Synthetischer Leitsatz',
    });
    expect(state.setters.setCaseLawCourt).toHaveBeenCalledExactlyOnceWith('');
    expect(state.setters.setCaseLawFileNumber).toHaveBeenCalledExactlyOnceWith('');
    expect(state.setters.setCaseLawHolding).toHaveBeenCalledExactlyOnceWith('');
    expect(state.setters.setCommentText).not.toHaveBeenCalled();
    expect(state.loadDetails).toHaveBeenCalledExactlyOnceWith(norm.id);
  });

  it('appends the checklist entry and clears only its draft', async () => {
    const state = setup();
    await state.edits.createChecklistItemForNorm(state.event);
    expect(state.service.createChecklistItem).toHaveBeenCalledExactlyOnceWith({ legalNormId: norm.id, text: 'Unterlagen prüfen', sortOrder: 1 });
    expect(state.setters.setChecklistText).toHaveBeenCalledExactlyOnceWith('');
    expect(state.setters.setCommentText).not.toHaveBeenCalled();
    expect(state.loadDetails).toHaveBeenCalledExactlyOnceWith(norm.id);
  });

  it.each(['createCommentForNorm', 'createCaseLawForNorm', 'createChecklistItemForNorm'] as const)('keeps the draft and does not reload after a failed %s', async (action) => {
    const state = setup();
    state.service.createComment.mockRejectedValue(new Error('Speichern fehlgeschlagen'));
    state.service.createCaseLaw.mockRejectedValue(new Error('Speichern fehlgeschlagen'));
    state.service.createChecklistItem.mockRejectedValue(new Error('Speichern fehlgeschlagen'));
    await state.edits[action](state.event);
    expect(state.setters.setError).toHaveBeenLastCalledWith('Speichern fehlgeschlagen');
    expect(state.loadDetails).not.toHaveBeenCalled();
    expect(state.setters.setCommentTitle).not.toHaveBeenCalled();
    expect(state.setters.setCaseLawCourt).not.toHaveBeenCalled();
    expect(state.setters.setChecklistText).not.toHaveBeenCalled();
    expect(state.event.preventDefault).toHaveBeenCalledOnce();
  });

  it('prevents submissions without a selected norm and reports a missing case-link context', async () => {
    const state = setup(null);
    await state.edits.createCommentForNorm(state.event);
    await state.edits.createCaseLawForNorm(state.event);
    await state.edits.createChecklistItemForNorm(state.event);
    await state.edits.linkSelectedNormToCase();
    expect(state.service.createComment).not.toHaveBeenCalled();
    expect(state.service.createCaseLaw).not.toHaveBeenCalled();
    expect(state.service.createChecklistItem).not.toHaveBeenCalled();
    expect(state.service.linkNormToCase).not.toHaveBeenCalled();
    expect(state.loadDetails).not.toHaveBeenCalled();
    expect(state.event.preventDefault).toHaveBeenCalledTimes(3);
    expect(state.setters.setError).toHaveBeenLastCalledWith('Bitte Norm und Fall auswählen.');
  });

  it('preserves a confirmed save when the subsequent detail refresh fails', async () => {
    const state = setup();
    state.loadDetails.mockRejectedValue(new Error('Aktualisierung fehlgeschlagen'));
    await state.edits.createCommentForNorm(state.event);
    expect(state.service.createComment).toHaveBeenCalledOnce();
    expect(state.setters.setMessage).toHaveBeenLastCalledWith('Kommentar gespeichert.');
    expect(state.setters.setError).toHaveBeenLastCalledWith('Aktualisierung fehlgeschlagen');
    expect(state.setters.setCommentText).toHaveBeenCalledExactlyOnceWith('');
  });
});
