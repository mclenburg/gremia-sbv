import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { collectVacationV5Sections } from '../../../../services/vacationV5SectionCollector';
import { assertVacationV5Sections } from '../../../../services/vacationV5SectionManifest';
import { importVacationV5Sections } from '../../../../services/vacationV5SectionImporter';

const empty = { caseIds: [], standaloneDeadlineIds: [], meetingIds: [], recruitingIds: [], employerObligationIds: [], inclusionAgreementIds: [], violationIds: [], assemblyIds: [] };

function database() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const adapter = {
    prepare<T = unknown>(sql: string) {
      const statement = raw.prepare(sql);
      return { all: (...args: unknown[]) => statement.all(...args as []) as T[], get: (...args: unknown[]) => statement.get(...args as []) as T | undefined,
        run: (...args: unknown[]) => statement.run(...args as []) };
    },
    exec: (sql: string) => raw.exec(sql), pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`), close: () => raw.close(),
  } satisfies DatabaseAdapter;
  return { raw, adapter };
}

describe('Format-5-Collector für fallfreie Arbeit', () => {
  it('sammelt eine Sitzung mit TOP und aufgelöster Frist ohne Fallakte', () => {
    const { raw, adapter } = database();
    try {
      raw.prepare(`INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, status, created_at, updated_at)
        VALUES ('meeting-local', 'other', 'Kommende Sitzung', '2099-11-20T10:00:00.000Z', 'draft', '2026-11-11', '2026-11-11')`).run();
      raw.prepare(`INSERT INTO sbv_meeting_agenda_items (id, meeting_id, position, title, own_position, status, created_at, updated_at)
        VALUES ('agenda-local', 'meeting-local', 1, 'TOP 1', 'SBV-Position', 'open', '2026-11-11', '2026-11-11')`).run();
      raw.prepare(`INSERT INTO deadlines (id, case_id, process_type, process_id, title, due_at, status, created_at, updated_at)
        VALUES ('deadline-local', NULL, 'sbv_meeting', 'meeting-local', 'Rückmeldung', '2099-11-19T10:00:00.000Z', 'open', '2026-11-11', '2026-11-11')`).run();
      const result = collectVacationV5Sections(adapter, { ...empty, meetingIds: ['meeting-local'], standaloneDeadlineIds: ['deadline-local'] });
      expect(result.sections.map((section) => [section.type, section.count])).toEqual([['meeting', 1], ['meeting_agenda', 1], ['deadline', 1]]);
      expect(result.sections.find((section) => section.type === 'meeting_agenda')?.items[0].parentRef).toBe('meeting_1');
      expect(result.sections.find((section) => section.type === 'deadline')?.items[0].parentRef).toBe('meeting_1');
      expect(JSON.stringify(result.sections)).not.toContain('meeting-local');
      expect(JSON.stringify(result.sections)).not.toContain('deadline-local');
      expect(assertVacationV5Sections(result.sections, result.manifest)).toEqual(result.sections);
      const destination = database();
      try {
        expect(importVacationV5Sections(destination.adapter, 'handover_cross_case_test', '2099-11-30', result.sections, result.manifest).importedCount).toBe(3);
        expect(destination.raw.prepare('SELECT COUNT(*) AS count FROM sbv_meetings').get()).toEqual({ count: 1 });
        expect(destination.raw.prepare('SELECT COUNT(*) AS count FROM sbv_meeting_agenda_items').get()).toEqual({ count: 1 });
        expect(destination.raw.prepare('SELECT COUNT(*) AS count FROM deadlines WHERE case_id IS NULL').get()).toEqual({ count: 1 });
      } finally { destination.raw.close(); }
    } finally { raw.close(); }
  });

  it('blockiert eine ausgewählte Frist mit nicht ausgewähltem Elternvorgang', () => {
    const { raw, adapter } = database();
    try {
      raw.prepare(`INSERT INTO deadlines (id, case_id, process_type, process_id, title, due_at, status, created_at, updated_at)
        VALUES ('deadline-local', NULL, 'sbv_meeting', 'missing', 'Rückmeldung', '2099-11-19', 'open', '2026-11-11', '2026-11-11')`).run();
      expect(() => collectVacationV5Sections(adapter, { ...empty, standaloneDeadlineIds: ['deadline-local'] })).toThrow(/Abhängigkeit/);
    } finally { raw.close(); }
  });

  it('sammelt Stellenbesetzung, Arbeitgeberpflicht, Inklusion, allgemeinen Verstoß und Versammlung mit Unterzeilen', () => {
    const { raw, adapter } = database();
    try {
      raw.exec(`
        INSERT INTO recruiting_participations (id, vacancy_title, status, created_at, updated_at) VALUES ('recruiting-local', 'Stelle', 'hearing_pending', '2026-11-11', '2026-11-11');
        INSERT INTO recruiting_interview_events (id, recruiting_participation_id, interview_date, applicant_ref, created_at, updated_at) VALUES ('interview-local', 'recruiting-local', '2099-11-20', 'B-17', '2026-11-11', '2026-11-11');
        INSERT INTO sbv_employer_obligation_reviews (id, obligation_key, period_year, status, created_at, updated_at) VALUES ('obligation-local', 'quota', 2099, 'follow_up', '2026-11-11', '2026-11-11');
        INSERT INTO sbv_inclusion_agreements (id, title, status, created_at, updated_at) VALUES ('agreement-local', 'Inklusion', 'negotiating', '2026-11-11', '2026-11-11');
        INSERT INTO sbv_inclusion_agreement_topics (id, agreement_id, topic_key, status, created_at, updated_at) VALUES ('topic-local', 'agreement-local', 'arbeit', 'open', '2026-11-11', '2026-11-11');
        INSERT INTO sbv_inclusion_officer_snapshots (id, name, status, created_at, updated_at) VALUES ('officer-local', 'Kontakt', 'appointed', '2026-11-11', '2026-11-11');
        INSERT INTO sbv_participation_violations (id, stage, status, violation_type, source_context_type, source_context_id, subject, measure_description, wrong_behavior, required_behavior, created_at, updated_at)
          VALUES ('violation-local', 'request', 'open', 'not_informed', 'general_employer_practice', 'general-local', 'Betreff', 'Maßnahme', 'Fehler', 'Erwartung', '2026-11-11', '2026-11-11');
        INSERT INTO sbv_participation_violation_events (id, violation_id, event_type, created_at) VALUES ('event-local', 'violation-local', 'created', '2026-11-11');
        INSERT INTO sbv_assemblies (id, year, scheduled_at, status, created_at, updated_at) VALUES ('assembly-local', 2099, '2099-11-20', 'draft', '2026-11-11', '2026-11-11');
      `);
      const result = collectVacationV5Sections(adapter, { ...empty, recruitingIds: ['recruiting-local'], employerObligationIds: ['obligation-local'],
        inclusionAgreementIds: ['agreement-local'], inclusionOfficerSnapshotId: 'officer-local', violationIds: ['violation-local'], assemblyIds: ['assembly-local'] });
      expect(result.sections.map((section) => section.type)).toEqual([
        'recruiting', 'employer_obligation', 'inclusion_agreement', 'violation', 'assembly', 'recruiting_interview', 'inclusion_topic', 'violation_event', 'inclusion_officer',
      ]);
      expect(JSON.stringify(result.sections)).not.toContain('general-local');
      expect(JSON.stringify(result.sections)).not.toContain('interview-local');
      expect(assertVacationV5Sections(result.sections, result.manifest)).toEqual(result.sections);
      const destination = database();
      try {
        expect(importVacationV5Sections(destination.adapter, 'handover_all_groups_test', '2099-11-30', result.sections, result.manifest).importedCount).toBe(9);
        for (const table of ['recruiting_participations', 'recruiting_interview_events', 'sbv_employer_obligation_reviews',
          'sbv_inclusion_agreements', 'sbv_inclusion_agreement_topics', 'sbv_inclusion_officer_snapshots',
          'sbv_participation_violations', 'sbv_participation_violation_events', 'sbv_assemblies']) {
          expect(destination.raw.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get(), table).toEqual({ count: 1 });
        }
      } finally { destination.raw.close(); }
    } finally { raw.close(); }
  });
});
