import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService';
import { ActivityJournalService } from '../services/activityJournalService';
import { ActivityJournalPreferenceService } from '../services/activityJournalPreferenceService';

type Row = Record<string, unknown>;
type RunResult = { changes: number };

class ActivityJournalBehaviorDb implements DatabaseAdapter {
  entries: Row[] = [];
  links: Row[] = [];
  preferences: Row[] = [];
  deadlines: Row[] = [];
  deadlineAudit: Row[] = [];
  personalAudit: Row[] = [];

  prepare<T = unknown>(sql: string) {
    const self = this;
    const normalized = sql.replace(/\s+/g, ' ').trim();
    return {
      all(...params: unknown[]): T[] {
        if (normalized.includes('SELECT metadata_json FROM personal_data_audit_log ORDER BY sequence ASC')) {
          return self.personalAudit.map((row) => ({ metadata_json: row.metadata_json })) as T[];
        }
        if (normalized.includes('SELECT * FROM personal_data_audit_log ORDER BY sequence ASC')) {
          return [...self.personalAudit].sort((a, b) => Number(a.sequence) - Number(b.sequence)) as T[];
        }
        if (normalized.includes('SELECT * FROM activity_journal_links WHERE entry_id = ?')) {
          const entryId = String(params[0]);
          return self.links.filter((row) => row.entry_id === entryId) as T[];
        }
        if (normalized.startsWith('SELECT DISTINCT e.* FROM activity_journal_entries e')) {
          return [...self.entries].sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date)) || String(b.updated_at).localeCompare(String(a.updated_at))) as T[];
        }
        if (normalized.includes("SELECT id FROM deadlines WHERE process_type = 'activity_journal'")) {
          return self.deadlines.filter((row) => row.process_type === 'activity_journal').map((row) => ({ id: row.id })) as T[];
        }
        return [] as T[];
      },
      get(...params: unknown[]): T | undefined {
        if (normalized.includes('SELECT sequence, entry_hash FROM personal_data_audit_log ORDER BY sequence DESC LIMIT 1')) {
          const previous = [...self.personalAudit].sort((a, b) => Number(b.sequence) - Number(a.sequence))[0];
          return previous as T | undefined;
        }
        if (normalized.includes('SELECT * FROM personal_data_audit_log WHERE id = ?')) {
          return self.personalAudit.find((row) => row.id === params[0]) as T | undefined;
        }
        if (normalized.includes('SELECT id FROM deadlines') && normalized.includes("source_event = 'activity_journal.follow_up'")) {
          const processId = String(params[0]);
          return self.deadlines.find((row) => row.process_type === 'activity_journal' && row.process_id === processId && row.source_event === 'activity_journal.follow_up') as T | undefined;
        }
        if (normalized.includes('SELECT * FROM deadlines WHERE id = ?')) {
          return self.deadlines.find((row) => row.id === params[0]) as T | undefined;
        }
        if (normalized.includes('SELECT * FROM activity_journal_entries WHERE id = ?')) {
          return self.entries.find((row) => row.id === params[0]) as T | undefined;
        }
        if (normalized.includes('SELECT category FROM activity_journal_category_preferences WHERE context_type = ?')) {
          return self.preferences.find((row) => row.context_type === params[0]) as T | undefined;
        }
        return undefined;
      },
      run(...params: unknown[]): RunResult {
        if (normalized.includes('INSERT INTO activity_journal_entries')) {
          self.entries.push({
            id: params[0], entry_date: params[1], started_at: params[2], ended_at: params[3], duration_minutes: params[4], time_mode: params[5], category: params[6], title: params[7],
            description: params[8], result_note: params[9], confidentiality_level: params[10], status: params[11], created_from: params[12], follow_up_due_at: params[13],
            performed_outside_contract_work_time: params[14], exported_for_activity_report_at: null, created_at: params[15], updated_at: params[16],
          });
          return { changes: 1 };
        }
        if (normalized.startsWith('UPDATE activity_journal_entries SET entry_date = ?')) {
          const id = params[15];
          const row = self.entries.find((entry) => entry.id === id);
          if (!row) return { changes: 0 };
          Object.assign(row, {
            entry_date: params[0], started_at: params[1], ended_at: params[2], duration_minutes: params[3], time_mode: params[4], category: params[5], title: params[6],
            description: params[7], result_note: params[8], confidentiality_level: params[9], status: params[10], created_from: params[11], follow_up_due_at: params[12],
            performed_outside_contract_work_time: params[13], updated_at: params[14],
          });
          return { changes: 1 };
        }
        if (normalized.startsWith('UPDATE activity_journal_entries SET exported_for_activity_report_at')) {
          const id = params[2];
          const row = self.entries.find((entry) => entry.id === id);
          if (!row) return { changes: 0 };
          row.exported_for_activity_report_at = params[0];
          row.updated_at = params[1];
          return { changes: 1 };
        }
        if (normalized.includes('DELETE FROM activity_journal_entries WHERE id = ?')) {
          const before = self.entries.length;
          self.entries = self.entries.filter((row) => row.id !== params[0]);
          self.links = self.links.filter((row) => row.entry_id !== params[0]);
          return { changes: before - self.entries.length };
        }
        if (normalized.includes('INSERT INTO activity_journal_links')) {
          self.links.push({ id: params[0], entry_id: params[1], target_type: params[2], target_id: params[3], created_at: params[4] });
          return { changes: 1 };
        }
        if (normalized.includes('DELETE FROM activity_journal_links WHERE entry_id = ?')) {
          const before = self.links.length;
          self.links = self.links.filter((row) => row.entry_id !== params[0]);
          return { changes: before - self.links.length };
        }
        if (normalized.includes('INSERT INTO activity_journal_category_preferences')) {
          const existing = self.preferences.find((row) => row.context_type === params[0]);
          if (existing) {
            existing.category = params[1];
            existing.updated_at = params[2];
          } else {
            self.preferences.push({ context_type: params[0], category: params[1], updated_at: params[2] });
          }
          return { changes: 1 };
        }
        if (normalized.includes('INSERT INTO personal_data_audit_log')) {
          self.personalAudit.push({ id: params[0], sequence: params[1], occurred_at: params[2], actor: params[3], action: params[4], subject_type: params[5], subject_id: params[6], case_id: params[7], purpose: params[8], metadata_json: params[9], previous_hash: params[10], entry_hash: params[11] });
          return { changes: 1 };
        }
        if (normalized.includes('INSERT INTO deadlines')) {
          self.deadlines.push({
            id: params[0], case_id: params[1], measure_id: params[2], person_id: params[3], process_id: params[4], process_type: params[5], deadline_type: params[6], title: params[7],
            confidential_title: params[8], description: params[9], due_at: params[10], reminder_at: params[11], legal_basis: params[12], source_event: params[13], severity: params[14],
            status: 'open', calculation_mode: params[15], is_legal_deadline: params[16], is_user_editable: params[17], warning_threshold_hours: params[18], critical_threshold_hours: params[19],
            dashboard_from_at: params[20], created_at: params[21], updated_at: params[22],
          });
          return { changes: 1 };
        }
        if (normalized.includes('DELETE FROM deadlines WHERE id = ?')) {
          const before = self.deadlines.length;
          self.deadlines = self.deadlines.filter((row) => row.id !== params[0]);
          return { changes: before - self.deadlines.length };
        }
        if (normalized.includes('INSERT INTO deadline_audit')) {
          self.deadlineAudit.push({ id: params[0], deadline_id: params[1], action: params[2], old_value: params[3], new_value: params[4], reason: params[5], created_at: params[6] });
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

function createDb(): ActivityJournalBehaviorDb {
  return new ActivityJournalBehaviorDb();
}

function auditMetadata(db: ActivityJournalBehaviorDb) {
  return db.personalAudit.map((row) => String(row.metadata_json ?? '')).join('\n');
}

describe('Tätigkeitsjournal Service-Verhalten 0.9.3-a-r1', () => {
  it('berechnet Dauer aus Zeitraum und löscht Dauer im Modus ohne Zeit', () => {
    const db = createDb();
    const service = new ActivityJournalService(db);

    const ranged = service.createEntry({
      title: 'Stellungnahme vorbereitet',
      category: 'participation',
      timeMode: 'range',
      startedAt: '2026-06-22T09:15:00.000Z',
      endedAt: '2026-06-22T10:05:00.000Z',
    });
    expect(ranged.durationMinutes).toBe(50);

    const updated = service.updateEntry(ranged.id, { timeMode: 'none' });
    expect(updated.timeMode).toBe('none');
    expect(updated.durationMinutes).toBeUndefined();
  });

  it('erzwingt konkrete Beschreibung bei SBV-Selbstorganisation', () => {
    const service = new ActivityJournalService(createDb());

    expect(() => service.createEntry({
      title: 'Ablage',
      category: 'sbv_self_organization',
    })).toThrow(/konkret beschrieben/);

    const created = service.createEntry({
      title: 'Ablage strukturiert',
      category: 'sbv_self_organization',
      description: 'Fristenübersicht geprüft und Ablagestruktur angepasst.',
    });
    expect(created.category).toBe('sbv_self_organization');
  });

  it('schreibt Audit nur mit Metadaten und ohne sensible Freitexte', () => {
    const db = createDb();
    const service = new ActivityJournalService(db);

    service.createEntry({
      title: 'Autismus-Anpassung für Kollegin Müller geprüft',
      description: 'Diagnose, Reizüberflutung und Homeoffice-Details besprochen.',
      resultNote: 'HR erneut zur Stellungnahme auffordern.',
      category: 'case_work',
      durationMinutes: 30,
    });

    const metadata = auditMetadata(db);
    expect(metadata).toContain('case_work');
    expect(metadata).not.toContain('Autismus');
    expect(metadata).not.toContain('Müller');
    expect(metadata).not.toContain('Diagnose');
    expect(metadata).not.toContain('Homeoffice-Details');
  });

  it('trennt Exportvorschau von bewusster Exportmarkierung', () => {
    const db = createDb();
    const service = new ActivityJournalService(db);
    const entry = service.createEntry({ title: 'Tätigkeitsbericht vorbereitet', category: 'documentation', durationMinutes: 45 });

    const preview = service.exportEntries({}, 'summary', { markAsExported: false });
    expect(preview.totalEntries).toBe(1);
    expect(service.getEntry(entry.id)?.exportedForActivityReportAt).toBeUndefined();

    const marked = service.exportEntries({}, 'summary', { markAsExported: true });
    expect(marked.totalEntries).toBe(1);
    expect(service.getEntry(entry.id)?.exportedForActivityReportAt).toBeTruthy();
  });

  it('synchronisiert Journal-Wiedervorlagen und entfernt sie beim Löschen des Eintrags', () => {
    const db = createDb();
    const service = new ActivityJournalService(db);

    const entry = service.createEntry({
      title: 'Rückmeldung HR nachhalten',
      category: 'employer_meeting',
      followUpDueAt: '2026-07-01',
      status: 'follow_up_open',
    });
    expect(db.deadlines).toEqual([expect.objectContaining({ process_type: 'activity_journal', process_id: entry.id })]);

    service.deleteEntry(entry.id);
    expect(db.deadlines).toHaveLength(0);
  });

  it('speichert pro Kontexttyp genau eine Kategoriepräferenz ohne Fallhistorie', () => {
    const db = createDb();
    const preferences = new ActivityJournalPreferenceService(db);

    preferences.rememberCategory('case', 'case_work');
    preferences.rememberCategory('case', 'consultation');

    expect(preferences.getPreferredCategory('case')).toBe('consultation');
    expect(db.preferences).toEqual([{ context_type: 'case', category: 'consultation', updated_at: expect.any(String) }]);
  });
});
