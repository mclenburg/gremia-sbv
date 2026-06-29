import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService';
import { RecruitingParticipationService } from '../services/recruitingParticipationService';
import { getRecruitingStatusActions, shouldSuggestViolationReview } from '../services/recruitingParticipationStatus';

type Row = Record<string, unknown>;

class RecruitingDb implements DatabaseAdapter {
  participations: Row[] = [];
  interviews: Row[] = [];
  audit: Row[] = [];
  execSql: string[] = [];

  prepare<T = unknown>(sql: string) {
    const self = this;
    const normalized = sql.replace(/\s+/g, ' ').trim();
    return {
      all(...params: unknown[]): T[] {
        if (normalized.includes('SELECT * FROM recruiting_participations')) return self.participations as T[];
        if (normalized.includes('SELECT * FROM recruiting_interview_events WHERE recruiting_participation_id = ?')) {
          return self.interviews.filter((row) => row.recruiting_participation_id === params[0]) as T[];
        }
        return [] as T[];
      },
      get(...params: unknown[]): T | undefined {
        if (normalized.includes('SELECT 1 AS value FROM recruiting_participations WHERE id = ?')) {
          return self.participations.some((row) => row.id === params[0]) ? { value: 1 } as T : undefined;
        }
        if (normalized.includes('SELECT COUNT(*) AS count FROM recruiting_interview_events WHERE recruiting_participation_id = ?')) {
          return { count: self.interviews.filter((row) => row.recruiting_participation_id === params[0]).length } as T;
        }
        if (normalized.includes('SELECT * FROM recruiting_participations WHERE id = ?')) return self.participations.find((row) => row.id === params[0]) as T | undefined;
        if (normalized.includes('SELECT * FROM recruiting_interview_events WHERE id = ?')) return self.interviews.find((row) => row.id === params[0]) as T | undefined;
        if (normalized.includes('SELECT sequence, entry_hash FROM personal_data_audit_log ORDER BY sequence DESC LIMIT 1')) return self.audit.at(-1) as T | undefined;
        return undefined;
      },
      run(...params: unknown[]): { changes: number } {
        if (normalized.includes('INSERT INTO recruiting_participations')) {
          self.participations.push({
            id: params[0], vacancy_title: params[1], vacancy_reference: params[2], department: params[3], location: params[4], status: params[5],
            employer_notice_date: params[6], documents_received_date: params[7], documents_complete: params[8], has_severely_disabled_applicants: params[9], severely_disabled_applicant_count: params[10],
            interview_count: 0, sbv_invited_to_all_known_interviews: params[11], sbv_participated: params[12], hearing_requested_date: params[13], hearing_due_date: params[14], statement_submitted_date: params[15],
            decision_known_date: params[16], decision_before_hearing: params[17], br_procedure_date: params[18], flagged_for_violation_review: params[19], violation_review_reason: params[20], notes: params[21], created_at: params[22], updated_at: params[23],
          });
          return { changes: 1 };
        }
        if (normalized.includes('UPDATE recruiting_participations SET interview_count = ?')) {
          const row = self.participations.find((item) => item.id === params[2]);
          if (row) { row.interview_count = params[0]; row.updated_at = params[1]; }
          return { changes: row ? 1 : 0 };
        }
        if (normalized.includes('UPDATE recruiting_participations')) {
          const row = self.participations.find((item) => item.id === params[22]);
          if (row) {
            Object.assign(row, { vacancy_title: params[0], vacancy_reference: params[1], department: params[2], location: params[3], status: params[4], employer_notice_date: params[5], documents_received_date: params[6], documents_complete: params[7], has_severely_disabled_applicants: params[8], severely_disabled_applicant_count: params[9], sbv_invited_to_all_known_interviews: params[10], sbv_participated: params[11], hearing_requested_date: params[12], hearing_due_date: params[13], statement_submitted_date: params[14], decision_known_date: params[15], decision_before_hearing: params[16], br_procedure_date: params[17], flagged_for_violation_review: params[18], violation_review_reason: params[19], notes: params[20], updated_at: params[21] });
          }
          return { changes: row ? 1 : 0 };
        }
        if (normalized.includes('INSERT INTO recruiting_interview_events')) {
          self.interviews.push({
            id: params[0], recruiting_participation_id: params[1], interview_date: params[2], applicant_ref: params[3], applicant_reference_mode: params[4], applicant_status: params[5],
            sbv_invited: params[6], sbv_invitation_date: params[7], sbv_attended: params[8], accessibility_check_status: params[9], follow_up_needed: params[10], procedural_note: params[11], created_at: params[12], updated_at: params[13],
          });
          return { changes: 1 };
        }
        if (normalized.includes('INSERT INTO personal_data_audit_log')) {
          self.audit.push({ id: params[0], sequence: params[1], metadata_json: params[9], entry_hash: params[11] });
          return { changes: 1 };
        }
        return { changes: 0 };
      },
    };
  }
  exec(sql: string): void { this.execSql.push(sql); }
  pragma(_sql: string): unknown { return undefined; }
  close(): void {}
}

describe('Stellenbesetzungen 0.9.5-a Servicebasis', () => {
  it('legt fallaktenunabhängige Stellenbesetzungen ohne Bewerberakte an', () => {
    const db = new RecruitingDb();
    const service = new RecruitingParticipationService(db);

    const record = service.create({
      vacancyTitle: 'Senior Systemadministrator:in',
      vacancyReference: 'IT-2026-17',
      hasSeverelyDisabledApplicants: true,
      employerNoticeDate: '2026-07-01',
    });

    expect(record.vacancyTitle).toBe('Senior Systemadministrator:in');
    expect(record.status).toBe('draft');
    expect(record.hasSeverelyDisabledApplicants).toBe(true);
    expect(record.interviewCount).toBe(0);
    expect(Object.keys(db.participations[0])).not.toContain('case_id');
  });

  it('erfasst Vorstellungsgespräche als Beteiligungsereignis ohne Gesprächsprotokollpflicht', () => {
    const db = new RecruitingDb();
    const service = new RecruitingParticipationService(db);
    const record = service.create({ vacancyTitle: 'Anwendungsentwicklung', hasSeverelyDisabledApplicants: true });

    const event = service.addInterview({
      recruitingParticipationId: record.id,
      interviewDate: '2026-07-05T09:00:00.000Z',
      applicantStatus: 'severely_disabled',
      sbvInvited: true,
      sbvAttended: true,
      accessibilityCheckStatus: 'contact_offered',
      proceduralNote: 'Nur Verfahrensnotiz, kein Gesprächsinhalt.',
    });

    expect(event.applicantRef).toBe('Bewerbung 1');
    expect(event.applicantReferenceMode).toBe('anonymous_reference');
    expect(service.getById(record.id)?.interviewCount).toBe(1);
    const auditJson = db.audit.map((row) => String(row.metadata_json)).join('\n');
    expect(auditJson).toContain('proceduralNotePresent');
    expect(auditJson).not.toContain('Nur Verfahrensnotiz');
  });

  it('trennt Verstoßprüfhinweis vom Statusmodell', () => {
    const db = new RecruitingDb();
    const service = new RecruitingParticipationService(db);
    const record = service.create({ vacancyTitle: 'Support', flaggedForViolationReview: true, violationReviewReason: 'missing_hearing_after_interview' });

    expect(record.status).toBe('draft');
    expect(record.flaggedForViolationReview).toBe(true);
    expect(record.violationReviewReason).toBe('missing_hearing_after_interview');
    expect(getRecruitingStatusActions(record).map((action) => action.targetStatus)).not.toContain('violation_review');
    expect(shouldSuggestViolationReview(record)).toBe(true);
  });
});
