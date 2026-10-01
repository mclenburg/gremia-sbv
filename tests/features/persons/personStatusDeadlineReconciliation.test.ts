import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { ProtectedPersonService } from '../../../services/protectedPersonService';
import { PersonStatusExpiryService } from '../../../services/personStatusExpiryService';

class SqliteAdapter implements DatabaseAdapter {
  constructor(private readonly database: DatabaseSync) {}
  prepare<T = unknown>(sql: string) {
    const statement = this.database.prepare(sql);
    return {
      all: (...params: unknown[]) => statement.all(...params as []) as T[],
      get: (...params: unknown[]) => statement.get(...params as []) as T | undefined,
      run: (...params: unknown[]) => statement.run(...params as []),
    };
  }
  exec(sql: string): void { this.database.exec(sql); }
  pragma(sql: string): unknown { return this.database.exec(`PRAGMA ${sql}`); }
  close(): void { this.database.close(); }
}

function dateAfter(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

describe('Statusablauffristen nach Korrektur des Personenstatus', () => {
  it('entfernt eine überholte Warnung und den Warnzustand nach Verlängerung', () => {
    const raw = new DatabaseSync(':memory:');
    try {
      raw.exec(readFileSync('database/schema.sql', 'utf8'));
      const database = new SqliteAdapter(raw);
      const persons = new ProtectedPersonService(database);
      const person = persons.create({ firstName: 'Mara', lastName: 'Beispiel', protectionStatus: 'equivalent', statusValidUntil: dateAfter(5) });
      const expiry = new PersonStatusExpiryService(database);
      expiry.evaluate();
      expect(persons.get(person.id)?.lifecycleState).toBe('expiring_soon');
      expect(raw.prepare("SELECT status FROM deadlines WHERE process_id = ? AND source_event = 'protected_person.status_expiry_warning'").get(person.id)).toMatchObject({ status: 'open' });

      persons.update(person.id, { statusValidUntil: dateAfter(90) });
      expiry.evaluate();

      expect(persons.get(person.id)?.lifecycleState).toBe('active');
      expect(raw.prepare("SELECT status FROM deadlines WHERE process_id = ? AND source_event = 'protected_person.status_expiry_warning'").get(person.id)).toMatchObject({ status: 'cancelled' });
    } finally {
      raw.close();
    }
  });

  it('bereinigt bereits vorhandene Warnungen mit veraltetem Ablaufdatum', () => {
    const raw = new DatabaseSync(':memory:');
    try {
      raw.exec(readFileSync('database/schema.sql', 'utf8'));
      const database = new SqliteAdapter(raw);
      const persons = new ProtectedPersonService(database);
      const person = persons.create({ firstName: 'Mara', lastName: 'Beispiel', protectionStatus: 'equivalent', statusValidUntil: dateAfter(5) });
      const expiry = new PersonStatusExpiryService(database);
      expiry.evaluate();

      raw.prepare('UPDATE protected_persons SET status_valid_until = ? WHERE id = ?').run(dateAfter(90), person.id);
      expiry.evaluate();

      expect(persons.get(person.id)?.lifecycleState).toBe('active');
      expect(raw.prepare("SELECT status FROM deadlines WHERE process_id = ? AND source_event = 'protected_person.status_expiry_warning'").get(person.id)).toMatchObject({ status: 'cancelled' });
    } finally {
      raw.close();
    }
  });
});
