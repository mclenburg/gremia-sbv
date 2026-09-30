import type { GremiaBrAuthService } from './gremiaBrAuthService.js';
import type { GremiaBrDocumentAccessRequestInput, GremiaBrOwnAccessApproval } from '../../src/domain/models/gremia-br.model.js';
import { ApplicationError } from '../../src/domain/models/application-error.model.js';
import { gremiaBrRecord } from './gremiaBrPayload.js';

const RESOURCE_TYPE = 'documents.document';
const MAX_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export class GremiaBrAccessApprovalService {
  constructor(private readonly auth: Pick<GremiaBrAuthService, 'post'>) {}

  async requestDocumentAccess(input: GremiaBrDocumentAccessRequestInput): Promise<GremiaBrOwnAccessApproval> {
    const documentId = input.documentId?.trim();
    const purpose = input.purpose?.trim();
    if (!documentId || documentId.length > 120 || !['READ', 'MANAGE'].includes(input.actionScope)
      || !purpose || purpose.length > 1024 || !Number.isInteger(input.durationMs)
      || input.durationMs <= 0 || input.durationMs > MAX_DURATION_MS) {
      throw new ApplicationError('VALIDATION_FAILED', 'Bitte Dokument, Zugriffsart, Zweck und eine gültige Laufzeit prüfen.');
    }
    const response = gremiaBrRecord(await this.auth.post<unknown>('/api/v1/access-approvals', {
      body: { resourceType: RESOURCE_TYPE, resourceId: documentId, actionScope: input.actionScope, purpose, durationMs: input.durationMs },
    }));
    if (!response || typeof response.id !== 'string' || !response.id || response.resourceType !== RESOURCE_TYPE
      || response.resourceId !== documentId || response.actionScope !== input.actionScope
      || response.status !== 'PENDING' || typeof response.requestedAt !== 'string' || !Number.isFinite(Date.parse(response.requestedAt))) {
      throw new ApplicationError('CONFLICT', 'Gremia.BR hat den eigenen Zugriffsantrag nicht eindeutig bestätigt. Bitte eigene Anträge bewusst neu abrufen, bevor Sie erneut beantragen.');
    }
    return { id: response.id, resourceType: RESOURCE_TYPE, status: 'PENDING', requestedAt: response.requestedAt };
  }
}
