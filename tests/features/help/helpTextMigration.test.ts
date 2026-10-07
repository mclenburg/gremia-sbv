import { createElement, type ComponentProps, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { HELP_REGISTRY, type HelpRegistryId } from '../../../src/app/shared/help/helpRegistry';
import { LiveRegionProvider } from '../../../src/app/shared/a11y/LiveRegionProvider';
import { ConfirmDialogProvider } from '../../../src/app/shared/dialogs/ConfirmDialogProvider';
import { RecruitingParticipationsView } from '../../../src/app/features/recruiting/RecruitingParticipationsView';
import { RecruitingProcedureForm } from '../../../src/app/features/recruiting/RecruitingProcedureForm';
import { RecruitingInterviewForm } from '../../../src/app/features/recruiting/RecruitingInterviewForm';
import { RecruitingFollowUpSection } from '../../../src/app/features/recruiting/RecruitingFollowUpSection';
import { emptyInterviewForm, emptyParticipationForm } from '../../../src/app/features/recruiting/recruitingParticipationViewSupport';
import { SbvParticipationViolationsView } from '../../../src/app/features/participation-violations/SbvParticipationViolationsView';
import { ViolationDraftForm } from '../../../src/app/features/participation-violations/ViolationDraftForm';
import { createInitialViolationForm } from '../../../src/app/features/participation-violations/sbvParticipationViolationViewLogic';
import { ActivityJournalView } from '../../../src/app/features/activity-journal/ActivityJournalView';
import { buildFromContext } from '../../../services/activityJournalPrefill';
import { descendants, renderElement, visibleText } from '../../helpers/renderedMarkup';

const noop = () => undefined;
function violationDraft(overrides: Partial<ComponentProps<typeof ViolationDraftForm>['state']> = {}): ReactElement {
  const state = {
    form: createInitialViolationForm(), contextNotice: null, fieldErrors: {}, caseOptions: [], measureOptions: [],
    busy: false, updateSourceContextType: noop, updateForm: noop, updateCaseContext: noop,
    updateMeasureContext: noop, createViolation: async () => undefined,
    ...overrides,
  } as unknown as ComponentProps<typeof ViolationDraftForm>['state'];
  return createElement(ViolationDraftForm, { state });
}

function renderWithProviders(element: ReactElement) {
  return renderElement(createElement(LiveRegionProvider, {
    children: createElement(ConfirmDialogProvider, { children: element }),
  }));
}

const helpScenarios: Array<{ name: string; element: () => ReactElement; helpIds: HelpRegistryId[] }> = [
  {
    name: 'Stellenbesetzungsübersicht',
    element: () => createElement(RecruitingParticipationsView, { onCreateDeadline: async () => undefined }),
    helpIds: ['recruiting.overview'],
  },
  {
    name: 'Verfahrensdaten',
    element: () => createElement(RecruitingProcedureForm, {
      form: emptyParticipationForm(), selected: null, saving: false, creating: false,
      onFormChange: noop, onCreate: noop, onUpdate: noop, onClose: noop,
    }),
    helpIds: ['recruiting.procedureData', 'recruiting.proceduralNote'],
  },
  {
    name: 'Vorstellungsgespräch',
    element: () => createElement(RecruitingInterviewForm, {
      interviewForm: emptyInterviewForm(), saving: false, updateInterviewForm: noop, onAdd: noop,
    }),
    helpIds: ['recruiting.interviewEvent', 'recruiting.applicantReference', 'recruiting.proceduralNote'],
  },
  {
    name: 'Wiedervorlage',
    element: () => createElement(RecruitingFollowUpSection, {
      dueAt: '', saving: false, onDueAtChange: noop, onFollowUp: noop, onViolationReview: noop,
    }),
    helpIds: ['recruiting.deadlineFollowUp'],
  },
  {
    name: 'Beteiligungsverstoßübersicht',
    element: () => createElement(SbvParticipationViolationsView, { cases: [], measures: [] }),
    helpIds: ['participationViolations.sourceContext', 'participationViolations.tracking'],
  },
  {
    name: 'Verstoßentwurf',
    element: () => violationDraft(),
    helpIds: ['participationViolations.sourceContext', 'participationViolations.stageAndType'],
  },
  {
    name: 'Tätigkeitsjournal mit Erfassung',
    element: () => createElement(ActivityJournalView, {
      pendingPrefill: buildFromContext({ contextType: 'fallfrei', title: 'Synthetische Tätigkeit' }),
    }),
    helpIds: ['activityJournal.overview', 'activityJournal.textCommands'],
  },
];

describe('Hilfe in Arbeitsmasken', () => {
  it.each(helpScenarios)('bietet die Hilfe in $name als benannte Dialogaktion an', ({ element, helpIds }) => {
    const { markup, tree } = renderWithProviders(element());
    const buttons = descendants(tree).filter((node) => node.tag === 'button');
    for (const helpId of helpIds) {
      const entry = HELP_REGISTRY[helpId];
      const matching = buttons.filter((button) => button.attrs['data-help-title'] === entry.title);
      expect(matching.length).toBeGreaterThan(0);
      for (const button of matching) {
        expect(button.attrs['aria-label']).toMatch(/hilfe öffnen/u);
        expect(button.attrs['aria-haspopup']).toBe('dialog');
      }
      // Explanations belong to the explicitly opened help, rather than the initial form.
      for (const block of entry.blocks) {
        const explanations = block.type === 'list' ? block.items : [block.text];
        for (const explanation of explanations) {
          expect(visibleText(markup)).not.toContain(explanation);
        }
      }
    }
  });

  it('hält die fachliche Eskalationswarnung im Formular sichtbar', () => {
    const { markup } = renderWithProviders(violationDraft({
      form: { ...createInitialViolationForm(), stage: 'abmahnung' },
      contextNotice: { sourceLabel: 'Allgemeiner Arbeitgeberverstoß', privacyNotice: 'Keine Personendaten erforderlich.' },
    }));
    const text = visibleText(markup);
    expect(text).toContain('Allgemeiner Arbeitgeberverstoß');
    expect(text).toContain('Keine Personendaten erforderlich.');
    expect(text).toContain('Scharfe Eskalationsstufe');
    expect(text).toContain('anwaltlich abgestimmt');
  });
});
