import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
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

describe('Stellenbesetzungen und Beteiligungsverstöße', () => {
  it('speichert den Recruiting-Bezug und erhält den Verstoß beim Löschen der Stellenbesetzung', () => {
    const db = new DatabaseSync(':memory:');
    try {
      db.exec('PRAGMA foreign_keys = ON');
      db.exec(readFileSync('database/schema.sql', 'utf8'));
      const timestamp = '2026-07-01T08:00:00.000Z';
      db.prepare(`INSERT INTO recruiting_participations (id, vacancy_title, created_at, updated_at)
        VALUES ('recruiting-1', 'IT Service Desk', ?, ?)`).run(timestamp, timestamp);
      db.prepare(`INSERT INTO sbv_participation_violations
        (id, stage, status, violation_type, source_context_type, source_context_id,
         related_recruiting_participation_id, subject, measure_description, wrong_behavior,
         required_behavior, created_at, updated_at)
        VALUES ('violation-1', 'request', 'draft', 'not_heard', 'recruiting_participation',
          'recruiting-1', 'recruiting-1', 'SBV-Anhörung fehlt', 'Stellenbesetzung',
          'Entscheidung ohne Anhörung', 'Anhörung durchführen', ?, ?)`).run(timestamp, timestamp);

      const record = db.prepare(`SELECT source_context_type, related_recruiting_participation_id, subject
        FROM sbv_participation_violations WHERE id = 'violation-1'`);
      expect(record.get()).toEqual({
        source_context_type: 'recruiting_participation', related_recruiting_participation_id: 'recruiting-1', subject: 'SBV-Anhörung fehlt',
      });
      db.prepare('DELETE FROM recruiting_participations WHERE id = ?').run('recruiting-1');
      expect(record.get()).toEqual({
        source_context_type: 'recruiting_participation', related_recruiting_participation_id: null, subject: 'SBV-Anhörung fehlt',
      });
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally {
      db.close();
    }
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
