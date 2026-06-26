import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService';
import { buildRetentionDashboard } from '../services/retentionPolicy';
import { SbvParticipationViolationService } from '../services/sbvParticipationViolationService';

type Row = Record<string, unknown>;
type RunResult = { changes: number };

class IntegrationDb implements DatabaseAdapter {
  violations: Row[] = [];
  events: Row[] = [];
  deadlines: Row[] = [];
  personalAudit: Row[] = [];
  cases: Row[] = [{ id: 'case-1', case_number: 'SBV-2026-001', status: 'offen' }, { id: 'case-2', case_number: 'SBV-2026-002', status: 'offen' }];
  caseMeasures: Row[] = [
    { id: 'measure-participation-1', case_id: 'case-1', type: 'sbv_participation' },
    { id: 'measure-other-1', case_id: 'case-1', type: 'bem' },
  ];
  caseMeasureParticipation: Row[] = [{ measure_id: 'measure-participation-1' }];
  violationDocuments: Row[] = [];
  generatedDocuments: Row[] = [{ id: 'generated-1', document_kind: 'sbv_participation_violation' }];

  prepare<T = unknown>(sql: string) {
    const self = this;
    const normalized = sql.replace(/\s+/g, ' ').trim();
    return {
      all(...params: unknown[]): T[] {
        if (normalized.includes('PRAGMA table_info(sbv_participation_violations)')) return [{ name: 'related_case_measure_id' }] as T[];
        if (normalized.includes('SELECT * FROM sbv_participation_violations')) return self.violations as T[];
        if (normalized.includes('SELECT * FROM sbv_participation_violation_events WHERE violation_id = ?')) return self.events.filter((event) => event.violation_id === params[0]) as T[];
        if (normalized.includes('SELECT document_id FROM sbv_participation_violation_documents WHERE violation_id = ?')) return self.violationDocuments.filter((row) => row.violation_id === params[0]) as T[];
        return [] as T[];
      },
      get(...params: unknown[]): T | undefined {
        if (normalized.includes('SELECT 1 AS value FROM cases WHERE id = ?')) return self.cases.find((row) => row.id === params[0]) as T | undefined;
        if (normalized.includes('SELECT id, case_id, type FROM case_measures WHERE id = ?')) return self.caseMeasures.find((row) => row.id === params[0]) as T | undefined;
        if (normalized.includes('SELECT 1 AS value FROM case_measure_participation WHERE measure_id = ?')) return self.caseMeasureParticipation.find((row) => row.measure_id === params[0]) as T | undefined;
        if (normalized.includes('SELECT 1 AS value FROM')) return { value: 1 } as T;
        if (normalized.includes('SELECT * FROM sbv_participation_violations WHERE id = ?')) return self.violations.find((row) => row.id === params[0]) as T | undefined;
        if (normalized.includes('SELECT * FROM deadlines WHERE id = ?')) return self.deadlines.find((row) => row.id === params[0]) as T | undefined;
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
        if (normalized.includes('INSERT INTO deadlines')) {
          self.deadlines.push({
            id: params[0], case_id: params[1], measure_id: params[2], person_id: params[3], process_id: params[4], process_type: params[5], deadline_type: params[6],
            title: params[7], confidential_title: params[8], description: params[9], due_at: params[10], reminder_at: params[11], legal_basis: params[12], source_event: params[13], severity: params[14], status: 'open', calculation_mode: params[15], is_legal_deadline: params[16], is_user_editable: params[17], warning_threshold_hours: params[18], critical_threshold_hours: params[19], dashboard_from_at: params[20], created_at: params[21], updated_at: params[22],
          });
          return { changes: 1 };
        }
        if (normalized.includes('UPDATE sbv_participation_violations SET related_deadline_id = ?')) {
          const row = self.violations.find((item) => item.id === params[3]);
          if (!row) return { changes: 0 };
          row.related_deadline_id = params[0];
          row.follow_up_due_at = params[1];
          row.updated_at = params[2];
          return { changes: 1 };
        }
        if (normalized.includes('DELETE FROM sbv_participation_violations WHERE id = ?')) {
          const before = self.violations.length;
          self.violations = self.violations.filter((row) => row.id !== params[0]);
          self.violationDocuments = self.violationDocuments.filter((row) => row.violation_id !== params[0]);
          return { changes: before - self.violations.length };
        }
        if (normalized.includes('DELETE FROM generated_documents WHERE id = ? AND document_kind = ?')) {
          const before = self.generatedDocuments.length;
          self.generatedDocuments = self.generatedDocuments.filter((row) => row.id !== params[0] || row.document_kind !== params[1]);
          return { changes: before - self.generatedDocuments.length };
        }
        if (normalized.includes('INSERT INTO deadline_audit')) return { changes: 1 };
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

function input() {
  return {
    stage: 'suspension_request' as const,
    violationType: 'implementation_without_participation' as const,
    sourceContextType: 'case' as const,
    sourceContextId: 'case-1',
    caseId: 'case-1',
    subject: 'Vollziehung ohne SBV-Beteiligung',
    measureDescription: 'Eine Entscheidung mit SBV-Bezug wurde vollzogen.',
    wrongBehavior: 'Die SBV wurde nicht vor der Entscheidung beteiligt.',
    requiredBehavior: 'Die Entscheidung ist auszusetzen und die Beteiligung binnen sieben Tagen nachzuholen.',
  };
}

describe('Beteiligungsverstoß Integration 0.9.4-c', () => {
  it('legt eine +7-Tage-Wiedervorlage als fallfreie Verstoß-Prozessfrist an und schreibt Verlauf', () => {
    const db = new IntegrationDb();
    const service = new SbvParticipationViolationService(db);
    const violation = service.create(input());

    const followUp = service.createFollowUp(violation.id, '2026-07-01');

    expect(followUp.title).toBe('Nachholung der SBV-Beteiligung prüfen');
    expect(db.deadlines[0]).toMatchObject({ process_type: 'sbv_participation_violation', process_id: violation.id, is_legal_deadline: 0 });
    expect(service.get(violation.id)?.relatedDeadlineId).toBe(followUp.deadlineId);
    expect(service.listEvents(violation.id).map((event) => event.eventType)).toContain('deadline_created');
  });

  it('erzeugt eine Journal-Vorlage ohne stille Speicherung und ohne neues Linkziel zu erfinden', () => {
    const service = new SbvParticipationViolationService(new IntegrationDb());
    const violation = service.create(input());

    const prefill = service.buildJournalPrefill(violation.id);

    expect(prefill.entry.title).toBe('Beteiligungsverstoß: Ergebnis dokumentiert');
    expect(prefill.entry.category).toBe('participation');
    expect(prefill.entry.links).toEqual([{ targetType: 'case', targetId: 'case-1' }]);
    expect(prefill.privacyNotice).toMatch(/noch kein Journaleintrag gespeichert/);
  });

  it('legt Beteiligungsverstoß aus echter SBV-Beteiligungsmaßnahme mit abgeleitetem Fallbezug an', () => {
    const service = new SbvParticipationViolationService(new IntegrationDb());

    const violation = service.create({
      ...input(),
      sourceContextType: 'case_measure_participation',
      sourceContextId: 'measure-participation-1',
      caseId: 'case-1',
    });

    expect(violation.caseId).toBe('case-1');
    expect(violation.relatedCaseMeasureId).toBe('measure-participation-1');
    expect(violation.relatedParticipationId).toBeUndefined();
  });

  it('verhindert falsche oder widersprüchliche Maßnahmankontexte im Main-Service', () => {
    const service = new SbvParticipationViolationService(new IntegrationDb());

    expect(() => service.create({
      ...input(),
      sourceContextType: 'case_measure_participation',
      sourceContextId: 'measure-other-1',
    })).toThrow(/keine SBV-Beteiligung/);

    expect(() => service.create({
      ...input(),
      sourceContextType: 'case_measure_participation',
      sourceContextId: 'measure-participation-1',
      caseId: 'case-2',
    })).toThrow(/Fallbezug passt nicht/);
  });

  it('löscht beim Entfernen eines Verstoßes auch zugehörige erzeugte Verstoßdokument-Metadaten', () => {
    const db = new IntegrationDb();
    const service = new SbvParticipationViolationService(db);
    const violation = service.create(input());
    db.violationDocuments.push({ violation_id: violation.id, document_id: 'generated-1' });

    const result = service.delete(violation.id);

    expect(result.deleted).toBe(true);
    expect(db.generatedDocuments).toEqual([]);
  });

  it('markiert offene und eskalierte Beteiligungsverstöße im Retention-Dashboard statt sie automatisch zu löschen', () => {
    const dashboard = buildRetentionDashboard({
      now: new Date('2026-08-01T10:00:00.000Z'),
      participationViolations: [{
        id: 'vio-open', stage: 'abmahnung', status: 'escalated', subject: 'Wiederholter Verstoß', documentCount: 1, createdAt: '2026-07-01T10:00:00.000Z', updatedAt: '2026-07-10T10:00:00.000Z',
      }],
    });

    expect(dashboard.candidates[0]).toMatchObject({ type: 'participation_violation_open_review', riskLevel: 'critical', entityType: 'sbv_participation_violation' });
  });

  it('macht geschlossene Verstoßvorgänge nach Retention-Frist prüfpflichtig', () => {
    const dashboard = buildRetentionDashboard({
      now: new Date('2026-08-01T10:00:00.000Z'),
      settings: { participationViolationReviewMonths: 1 },
      participationViolations: [{
        id: 'vio-closed', stage: 'request', status: 'closed', subject: 'Geheilter Verstoß', documentCount: 0, createdAt: '2026-05-01T10:00:00.000Z', updatedAt: '2026-05-03T10:00:00.000Z', closedAt: '2026-05-03T10:00:00.000Z',
      }],
    });

    expect(dashboard.candidates.some((candidate) => candidate.type === 'participation_violation_closed_review')).toBe(true);
  });
});
