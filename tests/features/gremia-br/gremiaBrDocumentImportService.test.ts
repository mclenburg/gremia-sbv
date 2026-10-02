import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { GremiaBrDocumentImportService } from '../../../services/gremiaBr/gremiaBrDocumentImportService';

const content = Buffer.from('%PDF-1.4\nTest');
const digest = createHash('sha256').update(content).digest('hex');

function setup() {
  const get = vi.fn(async (path: string) => path.endsWith('/versions') ? [{
    id: 'version-1', documentId: 'doc-1', processingState: 'READY',
    metadata: { filename: 'akte.pdf', mimeType: 'application/pdf', plaintextDigest: digest },
  }] : content);
  const auth = { get, post: vi.fn(), getReadContext: () => ({ selectedOrganizationId: 'org-1', selectedSecurityDomain: 'sbv' }) };
  const cases = { importDocument: vi.fn().mockResolvedValue({ id: 'local-1', caseId: 'case-1' }) };
  const security = { writeTemporaryFile: vi.fn().mockReturnValue('/protected/akte.pdf'), cleanupTemporaryFiles: vi.fn() };
  return { get, cases, security, service: new GremiaBrDocumentImportService(auth as never, cases as never, security as never) };
}

describe('Explizite Gremia.BR-Dokumentübernahme', () => {
  it('übernimmt die geprüfte Version über die zentrale verschlüsselte Fallpipeline mit Herkunft', async () => {
    const { service, cases, security } = setup();
    await expect(service.importToCase({ documentId: 'doc-1', versionId: 'version-1', title: 'Stellungnahme', caseId: 'case-1', containsHealthData: true }))
      .resolves.toEqual({ id: 'local-1', caseId: 'case-1' });
    expect(cases.importDocument).toHaveBeenCalledWith('case-1', '/protected/akte.pdf', true, undefined, {
      documentId: 'doc-1', versionId: 'version-1', title: 'Stellungnahme',
    });
    expect(security.cleanupTemporaryFiles).toHaveBeenCalledOnce();
  });

  it('räumt Klartext auch nach fehlgeschlagenem Import auf', async () => {
    const { service, cases, security } = setup();
    cases.importDocument.mockRejectedValue(new Error('storage failed'));
    await expect(service.importToCase({ documentId: 'doc-1', versionId: 'version-1', title: 'Stellungnahme', caseId: 'case-1', containsHealthData: false }))
      .rejects.toThrow('storage failed');
    expect(security.cleanupTemporaryFiles).toHaveBeenCalledOnce();
  });
});
