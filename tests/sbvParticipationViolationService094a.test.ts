import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService';
import { SbvParticipationViolationService } from '../services/sbvParticipationViolationService';

type Row = Record<string, unknown>;
type RunResult = { changes: number };

class ViolationBehaviorDb implements DatabaseAdapter {
  violations: Row[] = [];
  events: Row[] = [];
  personalAudit: Row[] = [];
  cases: Row[] = [{ id: 'case-1' }];
  activityJournalEntries: Row[] = [{ id: 'journal-1' }];

  prepare<T = unknown>(sql: string) {
    const self = this;
    const normalized = sql.replace(/\s+/g, ' ').trim();
    return {
      all(...params: unknown[]): T[] {
        if (normalized.includes('PRAGMA table_info(sbv_participation_violations)')) return [{ name: 'related_case_measure_id' }] as T[];
        if (normalized.includes('SELECT * FROM sbv_participation_violations')) return self.violations as T[];
        if (normalized.includes('SELECT document_id FROM sbv_participation_violation_documents WHERE violation_id = ?')) return [] as T[];
        if (normalized.includes('SELECT * FROM sbv_participation_violation_events WHERE violation_id = ?')) {
          return self.events.filter((event) => event.violation_id === params[0]) as T[];
        }
        return [] as T[];
      },
      get(...params: unknown[]): T | undefined {
        if (normalized.includes('SELECT 1 AS value FROM cases WHERE id = ?')) return self.cases.find((row) => row.id === params[0]) as T | undefined;
        if (normalized.includes('SELECT 1 AS value FROM activity_journal_entries WHERE id = ?')) return self.activityJournalEntries.find((row) => row.id === params[0]) as T | undefined;
        if (normalized.includes('SELECT 1 AS value FROM')) return { value: 1 } as T;
        if (normalized.includes('SELECT * FROM sbv_participation_violations WHERE id = ?')) return self.violations.find((row) => row.id === params[0]) as T | undefined;
        if (normalized.includes('SELECT sequence, entry_hash FROM personal_data_audit_log ORDER BY sequence DESC LIMIT 1')) return self.personalAudit.at(-1) as T | undefined;
        return undefined;
      },
      run(...params: unknown[]): RunResult {
        if (normalized.includes('INSERT INTO sbv_participation_violations')) {
          self.violations.push({
            id: params[0], stage: params[1], status: params[2], violation_type: params[3], source_context_type: params[4], source_context_id: params[5], case_id: params[6],
            related_participation_id: params[7], related_case_measure_id: params[8], related_termination_hearing_id: params[9], related_deadline_id: params[10], related_activity_journal_entry_id: params[11], related_sbv_control_protocol_id: params[12],
            subject: params[13], measure_description: params[14], wrong_behavior: params[15], required_behavior: params[16], consequence_warning: params[17], legal_basis: params[18], follow_up_due_at: params[19], created_at: params[20], updated_at: params[21], sent_at: params[22], closed_at: params[23],
          });
          return { changes: 1 };
        }
        if (normalized.includes('INSERT INTO sbv_participation_violation_events')) {
          self.events.push({ id: params[0], violation_id: params[1], event_type: params[2], from_status: params[3], to_status: params[4], note: params[5], created_at: params[6] });
          return { changes: 1 };
        }
        if (normalized.startsWith('UPDATE sbv_participation_violations SET status = ?')) {
          const row = self.violations.find((item) => item.id === params[6]);
          if (!row) return { changes: 0 };
          row.status = params[0];
          row.updated_at = params[1];
          if (params[2] === 'sent' && !row.sent_at) row.sent_at = params[3];
          if ((params[4] === 'closed' || params[4] === 'withdrawn') && !row.closed_at) row.closed_at = params[5];
          return { changes: 1 };
        }
        if (normalized.startsWith('UPDATE sbv_participation_violations SET stage = ?')) {
          const row = self.violations.find((item) => item.id === params[20]);
          if (!row) return { changes: 0 };
          Object.assign(row, {
            stage: params[0], violation_type: params[2], source_context_type: params[3], source_context_id: params[4], case_id: params[5], related_participation_id: params[6], related_case_measure_id: params[7], related_termination_hearing_id: params[8], related_deadline_id: params[9], related_activity_journal_entry_id: params[10], related_sbv_control_protocol_id: params[11], subject: params[12], measure_description: params[13], wrong_behavior: params[14], required_behavior: params[15], consequence_warning: params[16], legal_basis: params[17], follow_up_due_at: params[18], updated_at: params[19],
          });
          return { changes: 1 };
        }
        if (normalized.includes('DELETE FROM generated_documents WHERE id = ? AND document_kind = ?')) return { changes: 0 };
        if (normalized.includes('DELETE FROM sbv_participation_violations WHERE id = ?')) {
          const before = self.violations.length;
          self.violations = self.violations.filter((row) => row.id !== params[0]);
          self.events = self.events.filter((row) => row.violation_id !== params[0]);
          return { changes: before - self.violations.length };
        }
        if (normalized.includes('INSERT INTO personal_data_audit_log')) {
          self.personalAudit.push({ id: params[0], sequence: params[1], entry_hash: params[11], metadata_json: params[9] });
          return { changes: 1 };
        }
        return { changes: 0 };
      },
    };
  }
  exec(_sql: string): void {}
  pragma(_sql: string): unknown { return undefined; }
  close(): void {}
}

function createInput() {
  return {
    stage: 'request' as const,
    violationType: 'not_heard' as const,
    sourceContextType: 'case' as const,
    sourceContextId: 'case-1',
    caseId: 'case-1',
    subject: 'Anhörung zur Versetzung fehlte',
    measureDescription: 'Der Arbeitgeber bereitete eine Maßnahme mit möglichem SBV-Bezug vor.',
    wrongBehavior: 'Die SBV wurde vor der Entscheidung nicht angehört.',
    requiredBehavior: 'Die SBV muss vor der Entscheidung nach § 178 Abs. 2 Satz 1 SGB IX angehört werden.',
  };
}

describe('Beteiligungsverstoß-Service 0.9.4-a', () => {
  it('protokolliert einen vollständigen Verstoß und schreibt Verlauf ohne Schreibenstext ins Audit', () => {
    const db = new ViolationBehaviorDb();
    const service = new SbvParticipationViolationService(db);

    const record = service.create(createInput());

    expect(record.status).toBe('draft');
    expect(service.listEvents(record.id).map((event) => event.eventType)).toEqual(['created']);
    const audit = db.personalAudit.map((row) => String(row.metadata_json)).join('\n');
    expect(audit).toContain('not_heard');
    expect(audit).not.toContain('Versetzung fehlte');
    expect(audit).not.toContain('nicht angehört');
  });

  it('erzwingt die Transition-Map und lässt terminale Zustände nicht wieder öffnen', () => {
    const service = new SbvParticipationViolationService(new ViolationBehaviorDb());
    const record = service.create(createInput());

    expect(() => service.changeStatus(record.id, 'remedied')).toThrow(/nicht zulässig/);
    const open = service.changeStatus(record.id, 'open');
    expect(open.status).toBe('open');
    const sent = service.changeStatus(record.id, 'sent');
    expect(sent.sentAt).toBeDefined();
    const closed = service.changeStatus(record.id, 'closed');
    expect(closed.closedAt).toBeDefined();
    expect(() => service.update(record.id, { subject: 'erneut öffnen' })).toThrow(/Terminal/);
  });

  it('validiert den generischen Ausgangskontext statt fachlich hohle Nachweise anzulegen', () => {
    const db = new ViolationBehaviorDb();
    db.cases = [];
    const service = new SbvParticipationViolationService(db);

    expect(() => service.create(createInput())).toThrow(/Ausgangskontext/);
  });

  it('filtert nach Stage, Status und Suchbegriff als Modulverhalten statt per globalem Suchindex', () => {
    const service = new SbvParticipationViolationService(new ViolationBehaviorDb());
    const first = service.create(createInput());
    service.changeStatus(first.id, 'open');
    service.create({ ...createInput(), sourceContextType: 'activity_journal', sourceContextId: 'journal-1', caseId: undefined, stage: 'suspension_request', subject: 'Vollziehung droht' });

    expect(service.list({ status: 'open' })).toHaveLength(1);
    expect(service.list({ stage: 'suspension_request' })).toHaveLength(1);
    expect(service.list({ query: 'Vollziehung' })[0].stage).toBe('suspension_request');
  });
});
