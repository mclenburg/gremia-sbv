import { describe, expect, it } from 'vitest';
import { assertCanAssignLegacyCase, assertCanCreateRegularCase, assertSingleActivePersonBinding, decideLegacyCaseBindingMigration } from '../services/personCaseBindingPolicy';

describe('0.9.1 Person-Case-Binding Policy', () => {
  it('weist neue reguläre Fallakten ohne Person ab', () => {
    expect(() => assertCanCreateRegularCase({})).toThrow(/Person/i);
    expect(() => assertCanCreateRegularCase({ protectedPersonId: '   ' })).toThrow(/Person/i);
    expect(() => assertCanCreateRegularCase({ protectedPersonId: 'person-1' })).not.toThrow();
  });

  it('erlaubt anonyme Anfrage nur als bewussten Sonderweg', () => {
    expect(() => assertCanCreateRegularCase({ isAnonymousRequest: true, personBindingState: 'anonymous_request' })).not.toThrow();
    expect(() => assertCanCreateRegularCase({ isAnonymousRequest: true })).not.toThrow();
  });

  it('migriert genau einen aktiven Link sicher und markiert unklare Altfälle prüfpflichtig', () => {
    expect(decideLegacyCaseBindingMigration({ activePersonLinkIds: ['p1'], status: 'offen' })).toMatchObject({ protectedPersonId: 'p1', personBindingState: 'migrated', privacyReviewRequired: false });
    expect(decideLegacyCaseBindingMigration({ activePersonLinkIds: [], status: 'offen' })).toMatchObject({ protectedPersonId: null, personBindingState: 'legacy_unlinked', privacyReviewRequired: true, privacyReviewReason: 'no_person_link' });
    expect(decideLegacyCaseBindingMigration({ activePersonLinkIds: ['p1', 'p2'], status: 'offen' })).toMatchObject({ protectedPersonId: null, personBindingState: 'legacy_unlinked', privacyReviewRequired: true, privacyReviewReason: 'multiple_person_links' });
  });

  it('verhindert zwei aktive Personenbindungen, ignoriert aber Duplikate', () => {
    expect(() => assertSingleActivePersonBinding(['p1', 'p1'])).not.toThrow();
    expect(() => assertSingleActivePersonBinding(['p1', '', 'p2'])).toThrow(/zwei aktiven Personen/);
  });


  it('erlaubt Legacy-Zuordnung nur mit Altfall, Person und dokumentiertem Grund', () => {
    expect(() => assertCanAssignLegacyCase({ caseBindingState: 'active', selectedPersonId: 'p1', reason: 'geprüft' })).toThrow(/Legacy-Fallakten/);
    expect(() => assertCanAssignLegacyCase({ caseBindingState: 'legacy_unlinked', selectedPersonId: '', reason: 'geprüft' })).toThrow(/Person/);
    expect(() => assertCanAssignLegacyCase({ caseBindingState: 'legacy_unlinked', selectedPersonId: 'p1', reason: '   ' })).toThrow(/Grund/);
    expect(() => assertCanAssignLegacyCase({ caseBindingState: 'legacy_unlinked', selectedPersonId: 'p3', reason: 'geprüft', activePersonLinkIds: ['p1', 'p2'] })).not.toThrow();
    expect(() => assertCanAssignLegacyCase({ caseBindingState: 'legacy_unlinked', selectedPersonId: 'p1', reason: 'geprüft', activePersonLinkIds: ['p1', 'p2'] })).not.toThrow();
    expect(() => assertCanAssignLegacyCase({ caseBindingState: 'legacy_unlinked', selectedPersonId: 'p9', reason: 'geprüft', activePersonLinkIds: [] })).not.toThrow();
  });

  it('priorisiert Migrationen nach Fristen, Maßnahmen und Abschlusszustand', () => {
    expect(decideLegacyCaseBindingMigration({ activePersonLinkIds: [], status: 'offen', hasOpenDeadlines: true })).toMatchObject({ privacyReviewPriority: 'critical', anonymizationRecommended: false });
    expect(decideLegacyCaseBindingMigration({ activePersonLinkIds: [], status: 'offen', hasRunningMeasures: true })).toMatchObject({ privacyReviewPriority: 'high', anonymizationRecommended: false });
    expect(decideLegacyCaseBindingMigration({ activePersonLinkIds: [], status: 'offen' })).toMatchObject({ privacyReviewPriority: 'normal', anonymizationRecommended: false });
    expect(decideLegacyCaseBindingMigration({ activePersonLinkIds: [], status: 'abgeschlossen', hasOpenDeadlines: false, hasRunningMeasures: false })).toMatchObject({ privacyReviewPriority: 'low', anonymizationRecommended: true });
    expect(decideLegacyCaseBindingMigration({ activePersonLinkIds: [], status: 'abgeschlossen', closedAt: '2023-01-01T00:00:00.000Z', referenceDate: new Date('2026-05-01T00:00:00.000Z') })).toMatchObject({ privacyReviewPriority: 'low', anonymizationRecommended: true });
    expect(decideLegacyCaseBindingMigration({ activePersonLinkIds: [], status: 'abgeschlossen', closedAt: 'kein-datum', referenceDate: new Date('2026-05-01T00:00:00.000Z') })).toMatchObject({ privacyReviewPriority: 'low' });
  });
});
