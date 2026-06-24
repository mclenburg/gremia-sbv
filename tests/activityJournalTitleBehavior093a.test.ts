import { describe, expect, it } from 'vitest';
import { ActivityJournalTitleService } from '../services/activityJournalTitleService';

describe('Tätigkeitsjournal Titelsynthese 0.9.3-a', () => {
  it('synthetisiert fallfreie Titel nach konkreter Tätigkeit statt mit generischem Sammelbecken', () => {
    const titleService = new ActivityJournalTitleService();

    expect(titleService.synthesizeTitle({}, 'consultation')).toBe('Beratung / Sprechstunde dokumentiert');
    expect(titleService.synthesizeTitle({}, 'employer_meeting')).toBe('Arbeitgebergespräch dokumentiert');
    expect(titleService.synthesizeTitle({}, 'research')).toBe('Recherche / Recht dokumentiert');
    expect(titleService.synthesizeTitle({}, 'sbv_self_organization')).toBe('SBV-Selbstorganisation dokumentiert');
  });
});
