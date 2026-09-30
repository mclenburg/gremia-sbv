import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { MigrationService } from '../../../services/migrationService';
import { openTestDatabase } from '../../helpers/openTestDatabase';
import { GremiaBrOwnShareService } from '../../../services/gremiaBr/gremiaBrOwnShareService';

async function setup() {
  const db = await openTestDatabase();
  new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
  db.prepare(`INSERT INTO gremia_br_workspace_actions (id, action_type, remote_document_id, purpose, status, created_at)
    VALUES ('action-1', 'document_uploaded', 'owned-doc', 'Test', 'uploaded', '2026-09-30T08:00:00Z')`).run();
  const share = { id: 'share-1', documentId: 'owned-doc', targetSecurityDomain: 'br', status: 'ACTIVE', requirement: 'NONE', validUntil: '2026-12-01T00:00:00Z' };
  const get = vi.fn().mockResolvedValue([share]);
  const post = vi.fn().mockResolvedValue(share);
  const auth = { get, post, getReadContext: () => ({ selectedOrganizationId: 'org', selectedSecurityDomain: 'sbv' }) };
  return { db, get, post, service: new GremiaBrOwnShareService(() => db, auth as never) };
}

describe('Eigene Dokumentfreigaben', () => {
  it('liest und widerruft nur Freigaben eines nachweislich selbst übertragenen Dokuments', async () => {
    const { db, get, post, service } = await setup();
    try {
      expect(await service.list('owned-doc')).toMatchObject([{ id: 'share-1', status: 'ACTIVE' }]);
      await service.revoke({ documentId: 'owned-doc', shareId: 'share-1', reason: 'Nicht mehr erforderlich' });
      expect(get).toHaveBeenCalledWith('/api/v1/documents/owned-doc/shares');
      expect(post).toHaveBeenCalledWith('/api/v1/documents/shares/share-1/revocation', { body: { reason: 'Nicht mehr erforderlich' } });
    } finally { db.close(); }
  });

  it('lässt fremde Dokumente nicht über die Verwaltungsoberfläche abrufen', async () => {
    const { db, get, post, service } = await setup();
    try {
      await expect(service.list('foreign-doc')).rejects.toThrow('selbst übertragen');
      await expect(service.revoke({ documentId: 'foreign-doc', shareId: 'share-1', reason: 'Test' })).rejects.toThrow('selbst übertragen');
      expect(get).not.toHaveBeenCalled();
      expect(post).not.toHaveBeenCalled();
    } finally { db.close(); }
  });

  it('legt eine weitere Freigabe mit ausdrücklicher Laufzeit an', async () => {
    const { db, post, service } = await setup();
    try {
      await service.create({ documentId: 'owned-doc', targetSecurityDomain: 'br', purpose: 'Beratung', validUntil: '2026-12-01T00:00:00Z' });
      expect(post).toHaveBeenCalledWith('/api/v1/documents/owned-doc/shares', {
        body: { targetSecurityDomain: 'br', purpose: 'Beratung', validUntil: '2026-12-01T00:00:00Z' },
      });
    } finally { db.close(); }
  });

  it('zeigt alle selbst übertragenen Dokumente unabhängig vom Verlaufslimit', async () => {
    const { db, service } = await setup();
    try {
      for (let index = 0; index < 101; index += 1) {
        db.prepare(`INSERT INTO gremia_br_workspace_actions (id, action_type, remote_document_id, purpose, status, created_at)
          VALUES (?, 'document_uploaded', ?, 'Test', 'uploaded', '2026-09-30T08:00:00Z')`).run(`action-extra-${index}`, `doc-${index}`);
      }
      expect(service.listManagedDocuments()).toHaveLength(102);
    } finally { db.close(); }
  });
});
