import { describe, expect, it } from 'vitest';
import { requiresCaseProcessPrivacyReview } from '../../../src/app/features/cases/caseProcessPrivacy';
import type { CaseProcessType } from '../../../src/app/features/cases/caseWorkbenchTypes';

describe('Datenschutzprüfung abgeschlossener Fallmaßnahmen', () => {
  it('markiert abgeschlossene Maßnahmen aller sechs Verfahrenstypen', () => {
    const types: CaseProcessType[] = ['prevention', 'bem', 'equalization', 'termination_hearing', 'participation', 'workplace_accommodation'];
    for (const type of types) expect(requiresCaseProcessPrivacyReview(type, 'abgeschlossen')).toBe(true);
  });

  it('behandelt beim BEM auch Ablehnung und Abbruch als beendete Verfahren', () => {
    expect(requiresCaseProcessPrivacyReview('bem', 'abgelehnt')).toBe(true);
    expect(requiresCaseProcessPrivacyReview('bem', 'abgebrochen')).toBe(true);
    expect(requiresCaseProcessPrivacyReview('bem', 'massnahmen_in_klaerung')).toBe(false);
  });

  it('markiert laufende Maßnahmen nicht', () => {
    expect(requiresCaseProcessPrivacyReview('prevention', 'massnahmen_in_klaerung')).toBe(false);
    expect(requiresCaseProcessPrivacyReview('participation', 'anhoerung_laeuft')).toBe(false);
    expect(requiresCaseProcessPrivacyReview('workplace_accommodation', 'in_umsetzung')).toBe(false);
  });
});
