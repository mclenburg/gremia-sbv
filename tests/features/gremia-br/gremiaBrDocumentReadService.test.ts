import { describe, expect, it, vi } from 'vitest';
import { GremiaBrDocumentReadService } from '../../../services/gremiaBr/gremiaBrDocumentReadService';

function auth(get = vi.fn(), post = vi.fn()) {
  return {
    get,
    post,
    getReadContext: () => ({
      selectedOrganizationId: 'org-1', selectedSecurityDomain: 'sbv-domain', selectedBodyId: 'body-1',
    }),
  };
}

describe('Gremia.BR-Dokumentarbeitsbereich', () => {
  it('sucht nur auf Klick im ausgewählten Sicherheitsbereich und übernimmt keine Textausschnitte', async () => {
    const post = vi.fn().mockResolvedValue({ total: 1, hits: [{
      documentId: 'doc-1', documentVersionId: 'version-1',
      metadata: { title: 'Stellungnahme', filename: 'stellungnahme.pdf', mimeType: 'application/pdf', plaintextDigest: 'secret' },
      snippet: 'vertraulicher Dokumenttext',
    }] });
    const service = new GremiaBrDocumentReadService(auth(vi.fn(), post) as never);

    expect(post).not.toHaveBeenCalled();
    expect(await service.search('Stellungnahme')).toEqual([{
      documentId: 'doc-1', documentVersionId: 'version-1', title: 'Stellungnahme', filename: 'stellungnahme.pdf',
    }]);
    expect(post).toHaveBeenCalledWith('/api/v1/documents/search', {
      body: { organizationId: 'org-1', securityDomain: 'sbv-domain', query: 'Stellungnahme', limit: 25 },
    });
  });

  it('lädt Details, Versionen und Freigaben erst nach Auswahl und beschränkt die Rückgabe auf Fachmetadaten', async () => {
    const get = vi.fn(async (path: string) => {
      if (path.endsWith('/signatures')) return [
        { id: 'sig-1', documentVersionId: 'version-1', personId: 'private-person-1', state: 'SIGNED', verificationState: 'VERIFIED' },
        { id: 'sig-2', documentVersionId: 'version-1', personId: 'private-person-2', state: 'REQUESTED', verificationState: 'PENDING' },
      ];
      if (path.endsWith('/versions')) return [{ id: 'version-1', documentId: 'doc-1', versionNumber: 1, processingState: 'READY', byteSize: 200,
        metadata: { filename: 'fall.pdf', title: 'Stellungnahme', mimeType: 'application/pdf', plaintextDigest: 'secret' } }];
      if (path.endsWith('/shares')) return [{ id: 'share-1', status: 'ACTIVE', targetSecurityDomain: 'br-domain', validUntil: '2026-12-01T00:00:00Z', requirement: 'NONE', purpose: 'Beratung' }];
      return { id: 'doc-1', organizationId: 'org-1', securityDomain: 'sbv-domain', protectionClass: 'HIGH', status: 'ACTIVE', currentVersionId: 'version-1', versionCount: 1,
        currentVersion: { metadata: { filename: 'fall.pdf', title: 'Stellungnahme', description: 'Für BR', mimeType: 'application/pdf', plaintextDigest: 'secret' } } };
    });
    const service = new GremiaBrDocumentReadService(auth(get) as never);

    const result = await service.getDetail('doc-1');

    expect(result).toMatchObject({ title: 'Stellungnahme', description: 'Für BR', protectionClass: 'HIGH', currentVersionId: 'version-1' });
    expect(result.versions).toEqual([{ id: 'version-1', versionNumber: 1, filename: 'fall.pdf', mimeType: 'application/pdf', byteSize: 200, processingState: 'READY' }]);
    expect(result.shares).toEqual([{ id: 'share-1', status: 'ACTIVE', targetSecurityDomain: 'br-domain', validUntil: '2026-12-01T00:00:00Z', requirement: 'NONE' }]);
    expect(result.signatures).toEqual({ requested: 1, signed: 1, declined: 0, cancelled: 0, expired: 0, verificationFailed: 0 });
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain('private-person');
    expect(get).toHaveBeenCalledWith('/api/v1/documents/versions/version-1/signatures');
    expect(get).toHaveBeenCalledTimes(4);
  });

  it('startet ohne Sicherheitsbereich und bei leerer Suche keinen Remote-Request', async () => {
    const post = vi.fn();
    const service = new GremiaBrDocumentReadService({ ...auth(vi.fn(), post), getReadContext: () => ({}) } as never);
    await expect(service.search('Stellungnahme')).rejects.toThrow('Sicherheitsbereich');
    await expect(new GremiaBrDocumentReadService(auth(vi.fn(), post) as never).search('  ')).rejects.toThrow('Suchbegriff');
    expect(post).not.toHaveBeenCalled();
  });

  it('prüft Version, Dateityp und Digest vor der temporären Vorschau', async () => {
    const { createHash } = await import('node:crypto');
    const bytes = new TextEncoder().encode('%PDF-1.4\nTest');
    const digest = createHash('sha256').update(bytes).digest('hex');
    const get = vi.fn(async (path: string) => path.endsWith('/versions') ? [{
      id: 'version-1', documentId: 'doc-1', processingState: 'READY',
      metadata: { filename: 'fall.pdf', mimeType: 'application/pdf', plaintextDigest: digest },
    }] : bytes);
    const service = new GremiaBrDocumentReadService(auth(get) as never);

    const result = await service.readVersionForPreview('doc-1', 'version-1');

    expect(result.filename).toBe('fall.pdf');
    expect(result.content).toEqual(Buffer.from(bytes));
    expect(get).toHaveBeenCalledWith('/api/v1/documents/versions/version-1/content', { responseType: 'bytes' });
  });

  it('verweigert veränderte Bytes ohne sie zur Vorschau weiterzugeben', async () => {
    const get = vi.fn(async (path: string) => path.endsWith('/versions') ? [{
      id: 'version-1', documentId: 'doc-1', processingState: 'READY',
      metadata: { filename: 'fall.pdf', mimeType: 'application/pdf', plaintextDigest: '0'.repeat(64) },
    }] : new TextEncoder().encode('%PDF-1.4\nAndere Bytes'));
    await expect(new GremiaBrDocumentReadService(auth(get) as never)
      .readVersionForPreview('doc-1', 'version-1')).rejects.toThrow('Integrität');
  });
});
