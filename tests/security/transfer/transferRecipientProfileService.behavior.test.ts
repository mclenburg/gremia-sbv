import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { PersonalDataAuditLogService } from '../../../services/auditLogService';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { TransferInstanceIdentityService } from '../../../services/transferInstanceIdentityService';
import { TransferRecipientProfileService } from '../../../services/transferRecipientProfileService';
import { createTransferCapabilityDocument } from '../../../services/transferCapabilityDocument';

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
  it('übernimmt Paketfähigkeiten nur für den aktiven bekannten Schlüssel und nur bei neuerer Revision', () => {
    const target = database();
    const source = database();
    try {
      const service = new TransferRecipientProfileService(target.database);
      const sender = new TransferInstanceIdentityService(source.database).getPublicIdentity();
      const profile = service.save({ label: 'Quelle', recipientToken: sender.recipientToken });
      const capabilities = {
        protocolVersion: 1 as const, readFormats: [1, 2, 3, 4, 5], writeFormats: [2, 4, 5],
        features: ['manual_capability_exchange', 'return_scope_v5'], buildVersion: '0.9.8',
        revision: 2, issuedAt: '2026-11-11T10:00:00.000Z',
      };
      expect(service.recordAuthenticatedPackageCapabilities(sender, capabilities)).toBe(true);
      expect(service.recordAuthenticatedPackageCapabilities(sender, { ...capabilities, revision: 1 })).toBe(false);
      expect(service.list()[0]).toMatchObject({ id: profile.id, capabilities, capabilityStatus: 'verified' });
      expect(() => service.recordAuthenticatedPackageCapabilities({ ...sender, keyFingerprint: 'unknown' }, capabilities)).toThrow(/bekannten/);
      service.setActive(profile.id, false);
      expect(() => service.recordAuthenticatedPackageCapabilities(sender, { ...capabilities, revision: 3 })).toThrow(/aktiven/);
      expect(service.list()[0].capabilities?.revision).toBe(2);
    } finally { target.raw.close(); source.raw.close(); }
  });
  it('erstellt für bekannte aktive Ziele fortlaufend nummerierte, überprüfbare Fähigkeitsdateien', () => {
    const source = database();
    const target = database();
    try {
      const sender = new TransferInstanceIdentityService(source.database).getPrivateIdentity();
      const recipient = new TransferInstanceIdentityService(target.database).getPrivateIdentity();
      const service = new TransferRecipientProfileService(source.database);
      const profile = service.save({ label: 'Ziel', recipientToken: new TransferInstanceIdentityService(target.database).getPublicIdentity().recipientToken });
      const first = service.createCapability(profile.id, sender, '0.9.8');
      const second = service.createCapability(profile.id, sender, '0.9.8');
      expect(first.capabilities.revision).toBe(1);
      expect(second.capabilities.revision).toBe(2);
      expect(JSON.stringify(first)).not.toContain('PRIVATE KEY');
      const receiving = new TransferRecipientProfileService(target.database);
      const reverseProfile = receiving.save({ label: 'Quelle', recipientToken: new TransferInstanceIdentityService(source.database).getPublicIdentity().recipientToken });
      expect(receiving.acceptCapability(reverseProfile.id, second, recipient).capabilities?.revision).toBe(2);
      expect(() => receiving.acceptCapability(reverseProfile.id, first, recipient)).toThrow(/nicht neuer/);
      service.setActive(profile.id, false);
      expect(() => service.createCapability(profile.id, sender, '0.9.8')).toThrow(/deaktiviertes/);
    } finally { source.raw.close(); target.raw.close(); }
  });
  it('übernimmt nur neuere verifizierte Fähigkeiten des gespeicherten Schlüssels ohne ein deaktiviertes Profil zu aktivieren', () => {
    const source = database();
    const target = database();
    try {
      const sender = new TransferInstanceIdentityService(source.database).getPrivateIdentity();
      const recipient = new TransferInstanceIdentityService(target.database).getPrivateIdentity();
      const service = new TransferRecipientProfileService(target.database);
      const profile = service.save({ label: 'Vertretung', recipientToken: new TransferInstanceIdentityService(source.database).getPublicIdentity().recipientToken });
      service.setActive(profile.id, false);
      const capabilities = { protocolVersion: 1 as const, readFormats: [1, 2, 3, 4], writeFormats: [2, 4], features: ['manual_capability_exchange'], buildVersion: '0.9.8', revision: 2, issuedAt: '2026-11-11T10:00:00.000Z' };
      const document = createTransferCapabilityDocument(sender, recipient, capabilities);
      expect(service.acceptCapability(profile.id, document, recipient)).toMatchObject({ active: false, capabilities, capabilityStatus: 'verified' });
      expect(() => service.acceptCapability(profile.id, createTransferCapabilityDocument(sender, recipient, { ...capabilities, revision: 1 }), recipient)).toThrow(/nicht neuer/);
      expect(() => service.acceptCapability(profile.id, { ...document, capabilities: { ...capabilities, writeFormats: [5] } }, recipient)).toThrow();
      expect(service.list()[0]).toMatchObject({ active: false, capabilities, capabilityStatus: 'verified' });
    } finally { source.raw.close(); target.raw.close(); }
  });
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

  it('reaktiviert ein bewusst deaktiviertes Profil beim erneuten Speichern derselben Kennung nicht', () => {
    const target = database();
    try {
      const service = new TransferRecipientProfileService(target.database);
      const token = recipientToken();
      const profile = service.save({ label: 'Vertretung', recipientToken: token });
      service.setActive(profile.id, false);

      const updated = service.save({ label: 'Vertretung aktualisiert', recipientToken: token });

      expect(updated.id).toBe(profile.id);
      expect(updated.label).toBe('Vertretung aktualisiert');
      expect(updated.active).toBe(false);
      expect(service.list()).toHaveLength(1);
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
