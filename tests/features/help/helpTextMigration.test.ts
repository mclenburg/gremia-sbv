import { readFileSync } from 'node:fs';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HELP_REGISTRY } from '../../../src/app/shared/help/helpRegistry';
import { requiresHelpRegistryDecision } from '../../../src/app/shared/help/helpTextPolicy';
import { ViolationDraftForm } from '../../../src/app/features/participation-violations/ViolationDraftForm';
import { createInitialViolationForm } from '../../../src/app/features/participation-violations/sbvParticipationViolationViewLogic';

const MIGRATED_FEATURE_FILES = [
  'src/app/features/recruiting/RecruitingParticipationsView.tsx',
  'src/app/features/recruiting/RecruitingProcedureForm.tsx',
  'src/app/features/participation-violations/SbvParticipationViolationsView.tsx',
  'src/app/features/participation-violations/ViolationDraftForm.tsx',
  'src/app/features/activity-journal/ActivityJournalView.tsx',
  'src/app/features/activity-journal/ActivityJournalCreateDialog.tsx',
] as const;

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function visibleTextProps(fileSource: string): string[] {
  const matches = fileSource.matchAll(/(?:description|helpText)=\"([^\"]+)\"/g);
  return Array.from(matches, (match) => match[1]);
}

function renderedViolationDraft(): string {
  const noop = () => undefined;
  const state = {
    form: createInitialViolationForm([]), contextNotice: null, fieldErrors: {}, caseOptions: [], measureOptions: [],
    busy: false, updateSourceContextType: noop, updateForm: noop, updateCaseContext: noop,
    updateMeasureContext: noop, createViolation: async () => undefined,
  } as unknown as ComponentProps<typeof ViolationDraftForm>['state'];
  return renderToStaticMarkup(createElement(ViolationDraftForm, { state }));
}

describe('0.9.5-j Hilfetext-Migration Arbeitsmasken', () => {
  it('verschiebt belehrende Langtexte der priorisierten Arbeitsmasken hinter helpIds', () => {
    const recruiting = [
      source('src/app/features/recruiting/RecruitingParticipationsView.tsx'),
      source('src/app/features/recruiting/RecruitingProcedureForm.tsx'),
    ].join('\n');
    const violations = source('src/app/features/participation-violations/SbvParticipationViolationsView.tsx');
    const violationDraft = renderedViolationDraft();
    const journal = [
      source('src/app/features/activity-journal/ActivityJournalView.tsx'),
      source('src/app/features/activity-journal/ActivityJournalCreateDialog.tsx'),
    ].join('\n');

    expect(recruiting).toContain('helpId="recruiting.overview"');
    expect(recruiting).toContain('helpId="recruiting.procedureData"');
    expect(recruiting).toContain('helpId="recruiting.interviewEvent"');
    expect(recruiting).toContain('helpId="recruiting.deadlineFollowUp"');
    expect(violations).toContain('helpId="participationViolations.sourceContext"');
    expect(violationDraft).toContain(`data-help-title="${HELP_REGISTRY['participationViolations.stageAndType'].title}"`);
    expect(violations).toContain('helpId="participationViolations.tracking"');
    expect(journal).toContain('helpId="activityJournal.overview"');
    expect(journal).toContain('helpId="activityJournal.textCommands"');
  });

  it('lässt in den migrierten Masken keine sichtbaren description/helpText-Strings mit Reviewpflicht zurück', () => {
    const reviewRequired = MIGRATED_FEATURE_FILES.flatMap((file) =>
      visibleTextProps(source(file))
        .filter((text) => requiresHelpRegistryDecision(text))
        .map((text) => `${file}: ${text}`),
    );

    expect(reviewRequired).toEqual([]);
  });

  it('registriert die neu genutzten Hilfeeinträge zentral', () => {
    expect(Object.keys(HELP_REGISTRY)).toEqual(
      expect.arrayContaining([
        'recruiting.overview',
        'recruiting.deadlineFollowUp',
        'recruiting.applicantReference',
        'recruiting.proceduralNote',
        'participationViolations.stageAndType',
        'participationViolations.tracking',
        'activityJournal.overview',
      ]),
    );
  });
});
