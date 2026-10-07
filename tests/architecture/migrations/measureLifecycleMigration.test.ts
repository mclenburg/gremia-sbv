import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { openTestDatabase } from '../../helpers/openTestDatabase';

const schema = readFileSync('database/schema.sql', 'utf8');
const migration = readFileSync('database/migrations/0048_measure_lifecycle_audit.sql', 'utf8');
const periodStart = '2026-01-01T00:00:00.000Z';
const periodEnd = '2026-02-01T00:00:00.000Z';

const periodQuery = `
  SELECT id, sequence FROM personal_data_audit_log
  WHERE subject_type = ? AND occurred_at >= ? AND occurred_at < ?
  ORDER BY occurred_at, sequence
`;

const events = [
  { id: 'before-period', sequence: 1, occurredAt: '2025-12-31T23:59:59.999Z', subjectType: 'measure_lifecycle' },
  { id: 'later-in-period', sequence: 2, occurredAt: '2026-01-15T12:00:00.000Z', subjectType: 'measure_lifecycle' },
  { id: 'period-start', sequence: 3, occurredAt: periodStart, subjectType: 'measure_lifecycle' },
  { id: 'same-time-next-sequence', sequence: 4, occurredAt: periodStart, subjectType: 'measure_lifecycle' },
  { id: 'other-subject', sequence: 5, occurredAt: periodStart, subjectType: 'person' },
  { id: 'period-end', sequence: 6, occurredAt: periodEnd, subjectType: 'measure_lifecycle' },
];

describe('measure lifecycle period index migration', () => {
  it.each([false, true])('supports indexed period queries and preserves existing data (populated: %s)', async (populated) => {
    const db = await openTestDatabase();
    try {
      db.exec(schema);
      if (populated) {
        const insert = db.prepare(`
          INSERT INTO personal_data_audit_log (
            id, sequence, occurred_at, actor, action, subject_type,
            purpose, metadata_json, previous_hash, entry_hash
          ) VALUES (?, ?, ?, 'test', 'create', ?, 'lifecycle', '{}', ?, ?)
        `);
        for (const event of events) {
          insert.run(event.id, event.sequence, event.occurredAt, event.subjectType, '0'.repeat(64), '1'.repeat(64));
        }
      }
      const originalRows = db.prepare('SELECT * FROM personal_data_audit_log ORDER BY sequence').all();
      const expectedPeriod = populated ? [
        { id: 'period-start', sequence: 3 },
        { id: 'same-time-next-sequence', sequence: 4 },
        { id: 'later-in-period', sequence: 2 },
      ] : [];
      expect(db.prepare(periodQuery).all('measure_lifecycle', periodStart, periodEnd)).toEqual(expectedPeriod);

      for (let application = 0; application < 2; application += 1) {
        db.exec(migration);
        const indexedQuery = periodQuery.replace(
          'FROM personal_data_audit_log',
          'FROM personal_data_audit_log INDEXED BY idx_personal_data_audit_lifecycle_period',
        );
        expect(db.prepare(indexedQuery).all('measure_lifecycle', periodStart, periodEnd)).toEqual(expectedPeriod);
        expect(db.prepare('SELECT * FROM personal_data_audit_log ORDER BY sequence').all()).toEqual(originalRows);
      }
    } finally {
      db.close();
    }
  });
});
