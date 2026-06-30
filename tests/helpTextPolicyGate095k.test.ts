import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HELP_REGISTRY } from '../src/app/shared/help/helpRegistry';
import {
  INSTRUCTIONAL_TEXT_TRIGGERS,
  VISIBLE_DESCRIPTION_MAX_CHARS,
  VISIBLE_TEXT_POLICY_EXEMPT_CONTEXTS,
  requiresHelpRegistryDecision,
  textPolicyDecision,
  visibleTextPolicyDecision,
} from '../src/app/shared/help/helpTextPolicy';

const PRIORITIZED_WORK_MASKS = [
  'src/app/features/recruiting/RecruitingParticipationsView.tsx',
  'src/app/features/participation-violations/SbvParticipationViolationsView.tsx',
  'src/app/features/activity-journal/ActivityJournalView.tsx',
] as const;

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function visibleTextProps(fileSource: string): string[] {
  return Array.from(fileSource.matchAll(/(?:description|helpText)=\"([^\"]+)\"/g), (match) => match[1]);
}

describe('0.9.5-k Hilfetext-Policy-Gate', () => {
  it('führt die Triggerwörter explizit und testbar', () => {
    expect(INSTRUCTIONAL_TEXT_TRIGGERS).toEqual(
      expect.arrayContaining([
        'bewusst',
        'nur',
        'keine',
        'bitte',
        'dokumentiere',
        'erfasse',
        'diagnosen',
        'automatisch',
      ]),
    );
    expect(VISIBLE_DESCRIPTION_MAX_CHARS).toBeLessThanOrEqual(120);
  });

  it('unterscheidet normale sichtbare Texte von erlaubten Warn-/Fehlerkontexten', () => {
    const instructional = 'Bitte dokumentiere keine Diagnosen in dieser Arbeitsmaske.';
    expect(textPolicyDecision(instructional).shouldReview).toBe(true);
    expect(visibleTextPolicyDecision(instructional).shouldReview).toBe(true);
    expect(visibleTextPolicyDecision(instructional, 'escalation_warning').shouldReview).toBe(false);
    expect(VISIBLE_TEXT_POLICY_EXEMPT_CONTEXTS).toEqual(
      expect.arrayContaining(['validation_error', 'delete_warning', 'restore_warning', 'backup_warning', 'escalation_warning', 'empty_state']),
    );
  });

  it('hält priorisierte Arbeitsmasken frei von reviewpflichtigen sichtbaren description/helpText-Props', () => {
    const reviewRequired = PRIORITIZED_WORK_MASKS.flatMap((file) =>
      visibleTextProps(source(file))
        .filter((text) => requiresHelpRegistryDecision(text))
        .map((text) => `${file}: ${text}`),
    );

    expect(reviewRequired).toEqual([]);
  });

  it('hält lange erklärende Hilfetexte zentral in der HelpRegistry', () => {
    for (const helpId of [
      'recruiting.overview',
      'recruiting.procedureData',
      'recruiting.interviewEvent',
      'participationViolations.sourceContext',
      'participationViolations.stageAndType',
      'activityJournal.overview',
      'activityJournal.textCommands',
    ] as const) {
      const entry = HELP_REGISTRY[helpId];
      expect(entry.title.trim()).not.toHaveLength(0);
      expect(entry.blocks.length).toBeGreaterThan(0);
    }
  });
});
