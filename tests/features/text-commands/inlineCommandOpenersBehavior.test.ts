import { describe, expect, it, vi } from 'vitest';
import { openInlineCommandDraft } from '../../../src/app/features/cases/inlineCommands/inlineCommandOpeners';

function setup() {
  const openers = {
    setInlineDeadlineDraft: vi.fn(), setInlineContactDraft: vi.fn(), setInlineCaseLinkDraft: vi.fn(),
    setInlineLegalNormDraft: vi.fn(), setInlineRiskDraft: vi.fn(), setInlineOpenTaskDraft: vi.fn(),
    setInlineConfidentialityDraft: vi.fn(), setInlineAnonymizationDraft: vi.fn(), setInlineBemDraft: vi.fn(),
    setInlinePreventionDraft: vi.fn(), setInlineEqualizationDraft: vi.fn(), setInlineTerminationDraft: vi.fn(),
    setInlineParticipationDraft: vi.fn(), setInlineWorkplaceAccommodationDraft: vi.fn(), setInlineTemplateDraft: vi.fn(),
  };
  const getCommandText = vi.fn(() => 'Überlastung am Arbeitsplatz');
  return { openers, getCommandText };
}

describe('inline command draft opening', () => {
  it.each([
    ['/frist', 'setInlineDeadlineDraft', { severity: 'important', dueAt: '' }],
    ['/wv', 'setInlineDeadlineDraft', { title: 'Wiedervorlage', severity: 'normal' }],
    ['/kontakt', 'setInlineContactDraft', { query: '', category: 'sonstiges' }],
    ['/fall', 'setInlineCaseLinkDraft', { query: '' }],
    ['/norm', 'setInlineLegalNormDraft', { query: '' }],
    ['/risiko', 'setInlineRiskDraft', { level: 'high' }],
    ['/aufgabe', 'setInlineOpenTaskDraft', { title: '', severity: 'important' }],
    ['/vertr', 'setInlineConfidentialityDraft', { level: 'hoch_sensibel' }],
    ['/anon', 'setInlineAnonymizationDraft', { label: 'Name' }],
    ['/vorlage', 'setInlineTemplateDraft', { query: '' }],
  ] as const)('opens only the requested draft for %s', (token, setter, defaults) => {
    const state = setup();
    openInlineCommandDraft({ target: 'nextSteps', token, markerIndex: 17, noteTitle: 'Beratung', ...state });
    expect(state.openers[setter]).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      target: 'nextSteps', token, markerIndex: 17, ...defaults,
    }));
    for (const [name, open] of Object.entries(state.openers)) {
      if (name !== setter) expect(open).not.toHaveBeenCalled();
    }
  });

  it.each([
    ['/bem', 'setInlineBemDraft', 'triggerDescription'],
    ['/prävention', 'setInlinePreventionDraft', 'hazardDescription'],
    ['/gdb', 'setInlineEqualizationDraft', 'note'],
    ['/kündigung', 'setInlineTerminationDraft', 'employerReason'],
    ['/bet', 'setInlineParticipationDraft', 'employerMeasure'],
    ['/arbeitsplatz', 'setInlineWorkplaceAccommodationDraft', 'requestedAdjustment'],
  ] as const)('prefills %s with the command text and preserves its protocol position', (token, setter, textField) => {
    const state = setup();
    openInlineCommandDraft({ target: 'content', token, markerIndex: 8, commandValue: 'Protokoll', noteTitle: 'Beratung', ...state });
    expect(state.getCommandText).toHaveBeenCalledExactlyOnceWith('content', 8, token, 'Protokoll');
    expect(state.openers[setter]).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      target: 'content', token, markerIndex: 8, commandText: 'Überlastung am Arbeitsplatz',
      title: 'Überlastung am Arbeitsplatz', [textField]: 'Überlastung am Arbeitsplatz',
      prefilledFields: expect.arrayContaining([textField]),
    }));
    for (const [name, open] of Object.entries(state.openers)) {
      if (name !== setter) expect(open).not.toHaveBeenCalled();
    }
  });
});
