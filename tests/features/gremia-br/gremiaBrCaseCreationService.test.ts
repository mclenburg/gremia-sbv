import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { MigrationService } from '../../../services/migrationService';
import { openTestDatabase } from '../../helpers/openTestDatabase';
import { GremiaBrCaseCreationService } from '../../../services/gremiaBr/gremiaBrCaseCreationService';
import { GremiaBrHttpError } from '../../../services/gremiaBr/gremiaBrHttpClient';

async function setup() {
  const db = await openTestDatabase();
  new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
  const now = '2026-09-30T08:00:00.000Z';
  db.prepare(`INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at)
    VALUES ('case-1', 'SBV-2026-1', 'Lokaler vertraulicher Fall', 'sonstiges', ?, ?, ?)`).run(now, now, now);
  const get = vi.fn().mockResolvedValue([{ id: 'sbv.participation', title: 'SBV-Beteiligung', audience: 'sbv' }, { id: 'br.matter', title: 'BR-Verfahren', audience: 'br' }]);
  const post = vi.fn().mockImplementation(async (url: string) => url === '/api/v1/cases'
    ? { id: 'remote-case-1', reference: 'BR-2026-17', organizationId: 'org-1', origin: 'DISABILITY_REPRESENTATION', subject: 'Arbeitsplatzanpassung', procedureIds: [] }
    : { id: 'procedure-1', masterCaseId: 'remote-case-1', procedureType: 'sbv.participation' });
  const auth = { get, post, getReadContext: () => ({ selectedOrganizationId: 'org-1', selectedSecurityDomain: 'sbv-domain' }) };
  const references = { createOrUpdate: vi.fn().mockReturnValue({ id: 'link-1' }) };
  const service = new GremiaBrCaseCreationService(() => db, auth as never, references as never);
  return { db, service, get, post, references };
}

describe('Gremia.BR-Sachverhalt aus lokalem Fall', () => {
  it('überträgt nur freigegebene Minimaldaten und verknüpft erst das bestätigte Verfahren', async () => {
    const { db, service, get, post, references } = await setup();
    try {
      const result = await service.create({ localCaseId: 'case-1', subject: 'Arbeitsplatzanpassung', procedureType: 'sbv.participation' });
      expect(result.status).toBe('completed');
      expect(post).toHaveBeenNthCalledWith(1, '/api/v1/cases', expect.objectContaining({ body: {
        organizationId: 'org-1', origin: 'DISABILITY_REPRESENTATION', subject: 'Arbeitsplatzanpassung', securityDomain: 'sbv-domain',
      } }));
      expect(post).toHaveBeenNthCalledWith(2, '/api/v1/procedures', expect.objectContaining({ body: {
        masterCaseId: 'remote-case-1', procedureType: 'sbv.participation', securityDomain: 'sbv-domain',
      } }));
      expect(references.createOrUpdate).toHaveBeenCalledWith({ caseId: 'case-1', sourceType: 'verfahren', sourceId: 'procedure-1', title: 'BR-2026-17' });
      expect(get).toHaveBeenCalledWith('/api/v1/procedure-types', expect.objectContaining({ correlationId: expect.any(String) }));
      expect(post.mock.calls[0][1].correlationId).toBe(post.mock.calls[1][1].correlationId);
      expect(JSON.stringify(post.mock.calls)).not.toContain('Lokaler vertraulicher Fall');
    } finally { db.close(); }
  });

  it('bewahrt einen bestätigten Remote-Sachverhalt bei Verfahrensfehler zur bewussten Wiederaufnahme', async () => {
    const { db, service, post, references } = await setup();
    try {
      post.mockImplementationOnce(async () => ({ id: 'remote-case-1', reference: 'BR-2026-17', organizationId: 'org-1', origin: 'DISABILITY_REPRESENTATION', subject: 'Arbeitsplatzanpassung', procedureIds: [] }))
        .mockRejectedValueOnce(new GremiaBrHttpError('Ungültige Verfahrensdaten', 422, 'POST /api/v1/procedures'));
      const partial = await service.create({ localCaseId: 'case-1', subject: 'Arbeitsplatzanpassung', procedureType: 'sbv.participation' });
      expect(partial.status).toBe('case_created');
      expect(references.createOrUpdate).not.toHaveBeenCalled();
      await expect(service.create({ localCaseId: 'case-1', subject: 'Arbeitsplatzanpassung', procedureType: 'sbv.participation' })).rejects.toThrow('fortsetzen');
      expect(post).toHaveBeenCalledTimes(2);
      post.mockResolvedValueOnce({ id: 'procedure-1', masterCaseId: 'remote-case-1', procedureType: 'sbv.participation' });
      expect((await service.resume(partial.id)).status).toBe('completed');
      expect(post).toHaveBeenCalledTimes(3);
      expect(references.createOrUpdate).toHaveBeenCalledTimes(1);
    } finally { db.close(); }
  });

  it('sperrt nach unklarem Serverfehler doppelte Anlage bis zur manuellen Prüfung', async () => {
    const { db, service, post } = await setup();
    try {
      post.mockRejectedValueOnce(new Error('Server nicht erreichbar'));
      const result = await service.create({ localCaseId: 'case-1', subject: 'Arbeitsplatzanpassung', procedureType: 'sbv.participation' });
      expect(result.status).toBe('needs_review');
      await expect(service.resume(result.id)).rejects.toThrow('manuell prüfen');
      await expect(service.create({ localCaseId: 'case-1', subject: 'Arbeitsplatzanpassung', procedureType: 'sbv.participation' })).rejects.toThrow('fortsetzen');
      expect(post).toHaveBeenCalledTimes(1);
    } finally { db.close(); }
  });
});
