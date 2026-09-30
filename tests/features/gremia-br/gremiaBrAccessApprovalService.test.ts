import { describe, expect, it, vi } from 'vitest';
import { GremiaBrAccessApprovalService } from '../../../services/gremiaBr/gremiaBrAccessApprovalService';

const approval = {
  id: 'approval-1', resourceType: 'documents.document', resourceId: 'document-1',
  actionScope: 'MANAGE', requestedAt: '2026-09-30T12:00:00Z', status: 'PENDING',
};

describe('Eigener Gremia.BR-Zugriffsantrag', () => {
  it('stellt einen ausdrücklichen Antrag für das gewählte Dokument ohne fremde Bereiche zu übertragen', async () => {
    const post = vi.fn().mockResolvedValue(approval);
    const service = new GremiaBrAccessApprovalService({ post } as never);
    const result = await service.requestDocumentAccess({ documentId: 'document-1', actionScope: 'MANAGE', purpose: 'Für die Beratung erforderlich', durationMs: 86_400_000 });
    expect(post).toHaveBeenCalledWith('/api/v1/access-approvals', {
      body: { resourceType: 'documents.document', resourceId: 'document-1', actionScope: 'MANAGE', purpose: 'Für die Beratung erforderlich', durationMs: 86_400_000 },
    });
    expect(result).toEqual({ id: 'approval-1', resourceType: 'documents.document', status: 'PENDING', requestedAt: '2026-09-30T12:00:00Z' });
  });

  it('verwirft ungültige Eingaben und uneindeutige Serverantworten', async () => {
    const post = vi.fn().mockResolvedValue({ ...approval, resourceId: 'other-document' });
    const service = new GremiaBrAccessApprovalService({ post } as never);
    await expect(service.requestDocumentAccess({ documentId: 'document-1', actionScope: 'READ', purpose: ' ', durationMs: 86_400_000 })).rejects.toThrow();
    expect(post).not.toHaveBeenCalled();
    await expect(service.requestDocumentAccess({ documentId: 'document-1', actionScope: 'MANAGE', purpose: 'Beratung', durationMs: 86_400_000 })).rejects.toThrow('nicht eindeutig bestätigt');
  });
});
