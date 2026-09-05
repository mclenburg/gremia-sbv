import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { PersonalDataAuditLogService } from '../../../services/auditLogService';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { TransferInstanceIdentityService } from '../../../services/transferInstanceIdentityService';
import { TransferRecipientProfileService } from '../../../services/transferRecipientProfileService';

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
  exec(sql: string) { this.database.exec(sql); }
  pragma(sql: string) { return this.database.exec(`PRAGMA ${sql}`); }
  close() { this.database.close(); }
}

function database() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  return { raw, database: new SqliteAdapter(raw) };
}

function recipientToken() {
  const target = database();
  try {
    return new TransferInstanceIdentityService(target.database).getPublicIdentity().recipientToken;
  } finally {
    target.raw.close();
  }
}

describe('TransferRecipientProfileService', () => {
  it('speichert nur öffentliche Empfängerdaten und aktualisiert denselben Schlüssel ohne Dublette', () => {
    const target = database();
    try {
      const service = new TransferRecipientProfileService(target.database);
      const token = recipientToken();
      const created = service.save({ label: 'Vertretung Nord', recipientToken: token });
      const updated = service.save({ label: 'Vertretung Zentrale', recipientToken: token });

      expect(updated.id).toBe(created.id);
      expect(service.list()).toEqual([expect.objectContaining({
        id: created.id,
        label: 'Vertretung Zentrale',
        recipientToken: token,
        active: true,
      })]);
      const stored = target.raw.prepare('SELECT * FROM transfer_recipient_profiles').get() as Record<string, unknown>;
      expect(Object.keys(stored)).not.toEqual(expect.arrayContaining(['passphrase', 'private_key', 'private_key_pem']));
      expect(JSON.stringify(stored)).not.toContain('PRIVATE KEY');
    } finally {
      target.raw.close();
    }
  });

  it('deaktiviert Profile wiederherstellbar und entfernt sie nur auf ausdrücklichen Löschaufruf', () => {
    const target = database();
    try {
      const service = new TransferRecipientProfileService(target.database);
      const profile = service.save({ label: 'Amtsnachfolge', recipientToken: recipientToken() });

      expect(service.setActive(profile.id, false).active).toBe(false);
      expect(service.list()).toHaveLength(1);
      expect(service.remove(profile.id)).toEqual({ deleted: true });
      expect(service.list()).toEqual([]);
    } finally {
      target.raw.close();
    }
  });

  it('weist leere Bezeichnungen und manipulierte Empfängerkennungen zurück', () => {
    const target = database();
    try {
      const service = new TransferRecipientProfileService(target.database);
      expect(() => service.save({ label: '   ', recipientToken: recipientToken() })).toThrow(/Bezeichnung/);
      expect(() => service.save({ label: 'Unbekannt', recipientToken: 'GSBV1.FALSCH' })).toThrow(/Empfängerkennung/);
    } finally {
      target.raw.close();
    }
  });

  it('protokolliert Profiländerungen ohne Empfängerkennung oder Schlüsselmaterial im Audit', () => {
    const target = database();
    try {
      const audit = new PersonalDataAuditLogService(target.database);
      const service = new TransferRecipientProfileService(target.database, audit);
      const token = recipientToken();

      const profile = service.save({ label: 'Vertretung Datenschutz', recipientToken: token });
      service.setActive(profile.id, false);

      const auditRows = target.raw.prepare(`
        SELECT purpose, metadata_json
        FROM personal_data_audit_log
        WHERE subject_type = 'transfer_recipient_profile'
        ORDER BY sequence
      `).all() as Array<{ purpose: string; metadata_json: string }>;

      expect(auditRows).toHaveLength(2);
      expect(auditRows.map((row) => JSON.parse(row.metadata_json))).toEqual([{ active: true }, { active: false }]);
      const serializedAudit = JSON.stringify(auditRows);
      expect(serializedAudit).not.toContain(token);
      expect(serializedAudit).not.toContain('PRIVATE KEY');
      expect(serializedAudit).not.toContain('Vertretung Datenschutz');
    } finally {
      target.raw.close();
    }
  });
});
