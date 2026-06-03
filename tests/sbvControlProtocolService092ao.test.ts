import { describe, expect, it } from 'vitest';
import { SbvControlProtocolService } from '../services/sbvControlProtocolService';
import type { DatabaseAdapter } from '../services/databaseService';

class ProtocolDb implements DatabaseAdapter {
  protocols: any[] = [];
  audit: any[] = [];
  deadlines: any[] = [];
  deadlineAudit: any[] = [];

  prepare<T = unknown>(sql: string) {
    const self = this;
    return {
      all(..._params: unknown[]): T[] {
        if (sql.includes('FROM deadlines') && sql.includes("process_type = 'sbv_control_protocol'")) {
          const processId = _params[0];
          return self.deadlines.filter((row) => row.process_id === processId) as T[];
        }
        if (sql.includes('FROM sbv_control_protocols')) {
          return [...self.protocols].sort((a, b) => String(b.meeting_at).localeCompare(String(a.meeting_at))) as T[];
        }
        return [] as T[];
      },
      get(id?: string): T | undefined {
        if (sql.includes('FROM deadlines WHERE id = ?')) {
          return self.deadlines.find((row) => row.id === id) as T | undefined;
        }
        if (sql.includes('FROM deadlines') && sql.includes("process_type = 'sbv_control_protocol'")) {
          return self.deadlines.find((row) => row.process_id === id) as T | undefined;
        }
        if (sql.includes('FROM sbv_control_protocols WHERE id = ?')) {
          return self.protocols.find((row) => row.id === id) as T | undefined;
        }
        if (sql.includes('personal_data_audit_log') && sql.includes('ORDER BY sequence DESC')) {
          return self.audit.at(-1) as T | undefined;
        }
        return undefined;
      },
      run(...params: unknown[]) {
        if (sql.includes('INSERT INTO sbv_control_protocols')) {
          self.protocols.push({
            id: params[0],
            title: params[1],
            partner: params[2],
            topic: params[3],
            meeting_at: params[4],
            participants: params[5],
            legal_context: params[6],
            discussion: params[7],
            result: params[8],
            next_steps: params[9],
            follow_up_due_at: params[10],
            status: params[11],
            created_at: params[12],
            updated_at: params[13],
          });
          return { changes: 1 };
        }
        if (sql.includes('UPDATE sbv_control_protocols')) {
          const id = params.at(-1);
          const row = self.protocols.find((entry) => entry.id === id);
          if (!row) return { changes: 0 };
          Object.assign(row, {
            title: params[0],
            partner: params[1],
            topic: params[2],
            meeting_at: params[3],
            participants: params[4],
            legal_context: params[5],
            discussion: params[6],
            result: params[7],
            next_steps: params[8],
            follow_up_due_at: params[9],
            status: params[10],
            updated_at: params[11],
          });
          return { changes: 1 };
        }
        if (sql.includes('DELETE FROM sbv_control_protocols')) {
          const before = self.protocols.length;
          self.protocols = self.protocols.filter((entry) => entry.id !== params[0]);
          return { changes: before - self.protocols.length };
        }
        if (sql.includes('INSERT INTO deadlines')) {
          self.deadlines.push({
            id: params[0],
            case_id: params[1],
            measure_id: params[2],
            person_id: params[3],
            process_id: params[4],
            process_type: params[5],
            deadline_type: params[6],
            title: params[7],
            confidential_title: params[8],
            description: params[9],
            due_at: params[10],
            reminder_at: params[11],
            legal_basis: params[12],
            source_event: params[13],
            severity: params[14],
            status: 'open',
            calculation_mode: params[15],
            is_legal_deadline: params[16],
            is_user_editable: params[17],
            warning_threshold_hours: params[18],
            critical_threshold_hours: params[19],
            dashboard_from_at: params[20],
            created_at: params[21],
            updated_at: params[22],
          });
          return { changes: 1 };
        }
        if (sql.includes('UPDATE deadlines SET')) {
          const id = params.at(-1);
          const row = self.deadlines.find((entry) => entry.id === id);
          if (!row) return { changes: 0 };
          Object.assign(row, {
            title: params[0],
            confidential_title: params[1],
            description: params[2],
            due_at: params[3],
            reminder_at: params[4],
            legal_basis: params[5],
            source_event: params[6],
            severity: params[7],
            status: params[8],
            updated_at: params[16],
          });
          return { changes: 1 };
        }
        if (sql.includes('DELETE FROM deadlines')) {
          const before = self.deadlines.length;
          self.deadlines = self.deadlines.filter((entry) => entry.id !== params[0]);
          return { changes: before - self.deadlines.length };
        }
        if (sql.includes('INSERT INTO deadline_audit')) {
          self.deadlineAudit.push(params);
          return { changes: 1 };
        }
        if (sql.includes('INSERT INTO personal_data_audit_log')) {
          self.audit.push({
            action: params[4],
            subject_type: params[5],
            subject_id: params[6],
            purpose: params[8],
            metadata_json: params[9],
          });
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

describe('SBV-Steuerungsprotokolle', () => {
  it('legt übergreifende Protokolle ohne Fallzuordnung an', () => {
    const db = new ProtocolDb();
    const service = new SbvControlProtocolService(db as unknown as DatabaseAdapter);

    const record = service.create({
      title: 'Anpassung Homeoffice-Regelung',
      partner: 'joint',
      topic: 'workplace_rules',
      meetingAt: '2026-06-12',
      participants: 'Arbeitgeber, BR, SBV',
      discussion: 'Übergreifende Regelung für behinderungsbedingtes Homeoffice.',
      result: 'SBV fordert klare Prüfmatrix.',
      nextSteps: 'Entwurf bis Monatsende anfordern.',
      followUpDueAt: '2026-06-30',
      status: 'follow_up_open',
    });

    expect(record.id).toBeTruthy();
    expect(record.legalContext).toContain('§ 178 Abs. 1 Satz 1 SGB IX');
    expect(record.partner).toBe('joint');
    expect(record.status).toBe('follow_up_open');
    expect(record.followUpDueAt).toBe('2026-06-30T09:00:00.000Z');
    expect(db.deadlines).toHaveLength(1);
    expect(db.deadlines[0]).toMatchObject({ process_type: 'sbv_control_protocol', process_id: record.id, case_id: null, source_event: 'sbv_control_protocol.follow_up' });
    expect(db.audit.some((entry) => entry.action === 'create' && entry.subject_type === 'sbv_control_protocol')).toBe(true);
  });

  it('verhindert Protokolle ohne Titel und aktualisiert Topic-Rechtsgrundlage', () => {
    const service = new SbvControlProtocolService(new ProtocolDb() as unknown as DatabaseAdapter);

    expect(() => service.create({ title: '   ' })).toThrow(/Titel/);

    const record = service.create({ title: 'Inklusionsvereinbarung fortschreiben', topic: 'inclusion_agreement' });
    const updated = service.update(record.id, { topic: 'procedure', legalContext: '' });

    expect(updated.legalContext).toContain('§ 178 Abs. 2 Satz 1 SGB IX');
  });

  it('listet, editiert und löscht Steuerungsprotokolle getrennt von Fallakten', () => {
    const db = new ProtocolDb();
    const service = new SbvControlProtocolService(db as unknown as DatabaseAdapter);
    const record = service.create({ title: 'BR-Abstimmung Barrierefreiheit', topic: 'accessibility', followUpDueAt: '2026-07-01' });

    expect(service.list()).toHaveLength(1);
    expect(db.deadlines).toHaveLength(1);
    const updated = service.update(record.id, { title: 'BR-Abstimmung Barrierefreiheit nachhalten', followUpDueAt: '2026-07-02' });
    expect(updated.title).toContain('nachhalten');
    expect(db.deadlines).toHaveLength(1);
    expect(db.deadlines[0].due_at).toBe('2026-07-02T09:00:00.000Z');
    expect(service.delete(record.id).deleted).toBe(true);
    expect(service.list()).toHaveLength(0);
    expect(db.deadlines).toHaveLength(0);
  });
});
