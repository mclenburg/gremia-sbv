import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import type { BemProcessRecord, BemPhase, BemConsentStatus } from '../src/app/core/models/bem.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function mapBem(row: any): BemProcessRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    triggerDate: row.trigger_date ?? undefined,
    auDaysIn12Months: row.au_days_in_12_months ?? undefined,
    invitationSentAt: row.invitation_sent_at ?? undefined,
    responseDueAt: row.response_due_at ?? undefined,
    consentStatus: row.consent_status,
    firstMeetingAt: row.first_meeting_at ?? undefined,
    currentPhase: row.current_phase,
    sbvInvolved: Boolean(row.sbv_involved),
    brInvolved: Boolean(row.br_involved),
    worksDoctorInvolved: Boolean(row.works_doctor_involved),
    integrationOfficeInvolved: Boolean(row.integration_office_involved),
    notes: row.notes ?? undefined
  };
}

export class BemService {
  constructor(private readonly db: DatabaseAdapter) {}

  createForCase(caseId: string, triggerDate?: string): BemProcessRecord {
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO bem_processes (id, case_id, trigger_date, consent_status, current_phase, created_at, updated_at)
      VALUES (?, ?, ?, 'offen', 'pruefung', ?, ?)
    `).run(id, caseId, triggerDate ?? null, timestamp, timestamp);

    return this.getById(id)!;
  }

  listOpen(): BemProcessRecord[] {
    return this.db.prepare<any>(`
      SELECT * FROM bem_processes
      WHERE current_phase != 'abgeschlossen'
      ORDER BY COALESCE(response_due_at, trigger_date, created_at) ASC
    `).all().map(mapBem);
  }

  getById(id: string): BemProcessRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM bem_processes WHERE id = ?').get(id);
    return row ? mapBem(row) : undefined;
  }

  setPhase(id: string, phase: BemPhase): BemProcessRecord {
    this.db.prepare('UPDATE bem_processes SET current_phase = ?, updated_at = ? WHERE id = ?').run(phase, nowIso(), id);
    const updated = this.getById(id);
    if (!updated) throw new Error(`BEM process not found: ${id}`);
    return updated;
  }

  setConsent(id: string, consentStatus: BemConsentStatus): BemProcessRecord {
    this.db.prepare('UPDATE bem_processes SET consent_status = ?, updated_at = ? WHERE id = ?').run(consentStatus, nowIso(), id);
    const updated = this.getById(id);
    if (!updated) throw new Error(`BEM process not found: ${id}`);
    return updated;
  }
}
