import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_SCHEMA_VERSION, SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS } from '../../../services/appSchema';
import { PARTICIPATION_VIOLATION_SOURCE_CONTEXT_TYPES } from '../../../src/domain/models/sbv-participation-violation.model';
import { buildParticipationViolationPrefillFromRecruiting } from '../../../src/app/features/participation-violations/sbvParticipationViolationViewLogic';
import type { RecruitingParticipationRecord } from '../../../src/domain/models/recruiting-participation.model';

function recruitingRecord(overrides: Partial<RecruitingParticipationRecord> = {}): RecruitingParticipationRecord {
  return {
    id: 'recruiting-1',
    vacancyTitle: 'IT Service Desk',
    vacancyReference: 'IT-2026-07',
    status: 'interviews_completed',
    documentsComplete: false,
    hasSeverelyDisabledApplicants: true,
    interviewCount: 1,
    sbvInvitedToAllKnownInterviews: true,
    sbvParticipated: true,
    decisionBeforeHearing: false,
    flaggedForViolationReview: true,
    violationReviewReason: 'incomplete_information',
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('Stellenbesetzungen 0.9.5-c Integration', () => {
  it('führt Schema 0047 und den Recruiting-Kontext für Beteiligungsverstöße ein', () => {
    const migration = readFileSync('database/migrations/0047_participation_violation_recruiting_context.sql', 'utf8');
    const schema = readFileSync('database/schema.sql', 'utf8');

    expect(APP_SCHEMA_VERSION).toBe('0054');
    expect(PARTICIPATION_VIOLATION_SOURCE_CONTEXT_TYPES).toContain('recruiting_participation');
    expect(SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS).toContain('related_recruiting_participation_id');
    expect(migration).toContain('related_recruiting_participation_id');
    expect(migration).toContain('recruiting_participation');
    expect(schema).toContain('related_recruiting_participation_id');
  });

  it('erstellt einen datensparsamen Beteiligungsverstoß-Entwurf aus der Stellenbesetzung', () => {
    const prefill = buildParticipationViolationPrefillFromRecruiting(recruitingRecord());

    expect(prefill.form.sourceContextType).toBe('recruiting_participation');
    expect(prefill.form.sourceContextId).toBe('recruiting-1');
    expect(prefill.form.relatedRecruitingParticipationId).toBe('recruiting-1');
    expect(prefill.form.caseId).toBeUndefined();
    expect(prefill.form.violationType).toBe('incomplete_information');
    expect(prefill.privacyNotice).toContain('keine Bewerbernamen');
    expect(JSON.stringify(prefill.form)).not.toMatch(/Diagnose|GdB|medizinisch|Bewerbung 1|Max Mustermann/i);
  });

});
