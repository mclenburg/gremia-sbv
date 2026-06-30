import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HELP_REGISTRY } from '../src/app/shared/help/helpRegistry';
import { requiresHelpRegistryDecision } from '../src/app/shared/help/helpTextPolicy';

const MIGRATED_FEATURE_FILES = [
  'src/app/features/recruiting/RecruitingParticipationsView.tsx',
  'src/app/features/participation-violations/SbvParticipationViolationsView.tsx',
  'src/app/features/activity-journal/ActivityJournalView.tsx',
] as const;

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function visibleTextProps(fileSource: string): string[] {
  const matches = fileSource.matchAll(/(?:description|helpText)=\"([^\"]+)\"/g);
  return Array.from(matches, (match) => match[1]);
}

describe('0.9.5-j Hilfetext-Migration Arbeitsmasken', () => {
  it('verschiebt belehrende Langtexte der priorisierten Arbeitsmasken hinter helpIds', () => {
    const recruiting = source('src/app/features/recruiting/RecruitingParticipationsView.tsx');
    const violations = source('src/app/features/participation-violations/SbvParticipationViolationsView.tsx');
    const journal = source('src/app/features/activity-journal/ActivityJournalView.tsx');

    expect(recruiting).toContain('helpId="recruiting.overview"');
    expect(recruiting).toContain('helpId="recruiting.procedureData"');
    expect(recruiting).toContain('helpId="recruiting.interviewEvent"');
    expect(recruiting).toContain('helpId="recruiting.deadlineFollowUp"');
    expect(violations).toContain('helpId="participationViolations.sourceContext"');
    expect(violations).toContain('helpId="participationViolations.stageAndType"');
    expect(violations).toContain('helpId="participationViolations.tracking"');
    expect(journal).toContain('helpId="activityJournal.overview"');
    expect(journal).toContain('helpId="activityJournal.capture"');
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
        'activityJournal.capture',
      ]),
    );
  });
});
