import { describe, expect, it } from 'vitest';
import { BemService } from '../services/bemService';
import { EqualizationService } from '../services/equalizationService';
import { TerminationHearingService } from '../services/terminationHearingService';

class MemoryDb {
  rows: Record<string, any[]> = {
    bem_processes: [],
    equalization_processes: [],
    termination_hearings: [],
    personal_data_audit_log: []
  };

  prepare(sql: string) {
    const self = this;
    return {
      run(...params: any[]) {
        if (sql.includes('INSERT INTO personal_data_audit_log')) {
          self.rows.personal_data_audit_log.push({
            id: params[0],
            sequence: params[1],
            occurred_at: params[2],
            actor: params[3],
            action: params[4],
            subject_type: params[5],
            subject_id: params[6],
            case_id: params[7],
            purpose: params[8],
            metadata_json: params[9],
            previous_hash: params[10],
            entry_hash: params[11]
          });
        }

        if (sql.includes('INSERT INTO bem_processes')) {
          self.rows.bem_processes.push({
            id: params[0],
            case_id: params[1],
            status: params[2],
            title: params[3],
            trigger_type: params[4],
            trigger_description: params[5],
            sickness_days_twelve_months: params[6],
            bem_offered_at: params[7],
            response_due_at: params[8],
            employee_response: params[9],
            employee_response_at: params[10],
            privacy_notice_at: params[11],
            consent_scope: params[12],
            consent_withdrawn_at: params[13],
            data_retention_note: params[14],
            first_meeting_at: params[15],
            participants: params[16],
            measures: params[17],
            measure_owners: params[18],
            next_review_at: params[19],
            result: params[20],
            completion_reason: params[21],
            confidential_notes: params[22],
            created_at: params[23],
            updated_at: params[24]
          });
        }

        if (sql.includes('UPDATE bem_processes')) {
          const id = params.at(-1);
          const row = self.rows.bem_processes.find((entry) => entry.id === id);
          if (row && sql.includes('SET status =')) row.status = params[0];
        }

        if (sql.includes('INSERT INTO equalization_processes')) {
          self.rows.equalization_processes.push({
            id: params[0],
            case_id: params[1],
            application_status: params[2],
            agency_reference: params[3],
            application_submitted_at: params[4],
            decision_received_at: params[5],
            objection_due_at: params[6],
            outcome: params[7],
            notes: params[8],
            created_at: params[9],
            updated_at: params[10]
          });
        }

        if (sql.includes('UPDATE equalization_processes')) {
          const id = params.at(-1);
          const row = self.rows.equalization_processes.find((entry) => entry.id === id);
          if (row && sql.includes('SET application_status')) row.application_status = params[0];
        }

        if (sql.includes('INSERT INTO termination_hearings')) {
          self.rows.termination_hearings.push({
            id: params[0],
            case_id: params[1],
            hearing_received_at: params[2],
            employer_deadline_at: params[3],
            termination_type: params[4],
            sbv_hearing_complete: 0,
            br_hearing_known: 0,
            integration_office_approval_required: 1,
            integration_office_approval_status: 'unbekannt',
            statement_status: 'offen',
            statement_sent_at: null,
            risk_notes: null,
            created_at: params[5],
            updated_at: params[6]
          });
        }
      },
      get(id?: string) {
        if (sql.includes('personal_data_audit_log')) {
          if (sql.includes('ORDER BY sequence DESC')) {
            return self.rows.personal_data_audit_log.at(-1);
          }
          return self.rows.personal_data_audit_log.find((row) => row.id === id);
        }
        if (sql.includes('bem_processes')) return self.rows.bem_processes.find((row) => row.id === id);
        if (sql.includes('equalization_processes')) return self.rows.equalization_processes.find((row) => row.id === id);
        if (sql.includes('termination_hearings')) return self.rows.termination_hearings.find((row) => row.id === id);
        return undefined;
      },
      all(...params: any[]) {
        if (sql.includes('bem_process_contacts')) return [];
        if (sql.includes('bem_processes')) return params[0]
          ? self.rows.bem_processes.filter((row) => row.case_id === params[0])
          : self.rows.bem_processes;
        if (sql.includes('equalization_processes')) return params[0]
          ? self.rows.equalization_processes.filter((row) => row.case_id === params[0])
          : self.rows.equalization_processes;
        if (sql.includes('personal_data_audit_log')) return self.rows.personal_data_audit_log;
        return [];
      }
    };
  }

  exec() {}
  pragma() {}
  close() {}
}

describe('process services', () => {
  it('creates a BEM process for a case', () => {
    const service = new BemService(new MemoryDb() as any);
    const process = service.createForCase('case-1', '2026-05-02');
    expect(process.caseId).toBe('case-1');
    expect(process.currentPhase).toBe('pruefung');
  });

  it('creates an equalization process for a case', () => {
    const service = new EqualizationService(new MemoryDb() as any);
    const process = service.createForCase('case-2');
    expect(process.applicationStatus).toBe('beratung');
  });

  it('creates a termination hearing with critical dates', () => {
    const service = new TerminationHearingService(new MemoryDb() as any);
    const hearing = service.create({ caseId: 'case-3', hearingReceivedAt: '2026-05-02T09:00:00.000Z' });
    expect(hearing.statementStatus).toBe('offen');
    expect(hearing.integrationOfficeApprovalRequired).toBe(true);
  });
});
