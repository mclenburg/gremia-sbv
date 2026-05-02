import { describe, expect, it } from 'vitest';
import { BemService } from '../services/bemService';
import { EqualizationService } from '../services/equalizationService';
import { TerminationHearingService } from '../services/terminationHearingService';

class MemoryDb {
  rows: Record<string, any[]> = { bem_processes: [], equalization_processes: [], termination_hearings: [] };
  prepare(sql: string) {
    const self = this;
    return {
      run(...params: any[]) {
        if (sql.includes('INSERT INTO bem_processes')) {
          self.rows.bem_processes.push({ id: params[0], case_id: params[1], trigger_date: params[2], consent_status: 'offen', current_phase: 'pruefung', sbv_involved: 0, br_involved: 0, works_doctor_involved: 0, integration_office_involved: 0 });
        }
        if (sql.includes('UPDATE bem_processes SET current_phase')) {
          const row = self.rows.bem_processes.find((r) => r.id === params[2]);
          if (row) row.current_phase = params[0];
        }
        if (sql.includes('INSERT INTO equalization_processes')) {
          self.rows.equalization_processes.push({ id: params[0], case_id: params[1], application_status: 'beratung' });
        }
        if (sql.includes('UPDATE equalization_processes SET application_status')) {
          const row = self.rows.equalization_processes.find((r) => r.id === params[2]);
          if (row) row.application_status = params[0];
        }
        if (sql.includes('INSERT INTO termination_hearings')) {
          self.rows.termination_hearings.push({ id: params[0], case_id: params[1], hearing_received_at: params[2], employer_deadline_at: params[3], termination_type: params[4], sbv_hearing_complete: 0, br_hearing_known: 0, integration_office_approval_required: 1, integration_office_approval_status: 'unbekannt', statement_status: 'offen' });
        }
      },
      get(id: string) {
        if (sql.includes('bem_processes')) return self.rows.bem_processes.find((r) => r.id === id);
        if (sql.includes('equalization_processes')) return self.rows.equalization_processes.find((r) => r.id === id);
        if (sql.includes('termination_hearings')) return self.rows.termination_hearings.find((r) => r.id === id);
      },
      all() { return self.rows.bem_processes; }
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
