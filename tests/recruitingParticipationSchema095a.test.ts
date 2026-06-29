import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_SCHEMA_VERSION, RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS, RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS } from '../services/appSchema';

describe('Stellenbesetzungen 0.9.5-a Schema', () => {
  it('führt Schema 0045 mit zwei Recruiting-Tabellen ein', () => {
    const migration = readFileSync('database/migrations/0045_recruiting_participations.sql', 'utf8');
    const schema = readFileSync('database/schema.sql', 'utf8');

    expect(APP_SCHEMA_VERSION).toBe('0047');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS recruiting_participations');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS recruiting_interview_events');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS recruiting_participations');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS recruiting_interview_events');
  });

  it('verankert Datenschutzgrenzen im Tabellenmodell', () => {
    const migration = readFileSync('database/migrations/0045_recruiting_participations.sql', 'utf8');

    expect(migration).toContain('applicant_ref TEXT NOT NULL');
    expect(migration).toContain("applicant_reference_mode TEXT NOT NULL DEFAULT 'anonymous_reference'");
    expect(migration).toContain('accessibility_check_status TEXT NOT NULL DEFAULT');
    expect(migration).toContain('procedural_note TEXT');
    expect(migration).not.toMatch(/diagnose|gdb|gesundheitsdaten|conversation_protocol|interview_transcript/i);
  });

  it('prüft neue Pflichtspalten über appSchema', () => {
    expect(RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS).toContain('flagged_for_violation_review');
    expect(RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS).toContain('interview_count');
    expect(RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS).toContain('applicant_reference_mode');
    expect(RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS).toContain('accessibility_check_status');
  });
});
