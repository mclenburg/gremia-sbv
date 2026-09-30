import type { DatabaseAdapter } from '../databaseService.js';
import type { GremiaBrAuthService } from './gremiaBrAuthService.js';
import type { GremiaBrManagedDocument, GremiaBrOwnShare, GremiaBrShareCreateInput, GremiaBrShareRevokeInput } from '../../src/domain/models/gremia-br.model.js';
import { ApplicationError } from '../../src/domain/models/application-error.model.js';
import { gremiaBrRecord } from './gremiaBrPayload.js';

function required(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApplicationError('VALIDATION_FAILED', `Bitte ${label} angeben.`);
  return value.trim();
}

function parseShare(value: unknown, documentId: string): GremiaBrOwnShare {
  const share = gremiaBrRecord(value);
  if (!share || share.documentId !== documentId || typeof share.id !== 'string' || typeof share.status !== 'string'
    || typeof share.targetSecurityDomain !== 'string' || typeof share.validUntil !== 'string') {
    throw new ApplicationError('REMOTE_READ_FAILED', 'Gremia.BR hat unvollständige Freigabedaten geliefert. Bitte erneut abrufen.');
  }
  return {
    id: share.id, status: share.status, targetSecurityDomain: share.targetSecurityDomain,
    validUntil: share.validUntil, requirement: typeof share.requirement === 'string' ? share.requirement : '',
    purpose: typeof share.purpose === 'string' ? share.purpose : '',
  };
}

export class GremiaBrOwnShareService {
  constructor(private readonly getDatabase: () => DatabaseAdapter, private readonly auth: Pick<GremiaBrAuthService, 'get' | 'post'>) {}

  listManagedDocuments(): GremiaBrManagedDocument[] {
    return this.getDatabase().prepare<{ remote_document_id: string; title: string | null }>(`
      SELECT a.remote_document_id, MAX(d.title) AS title
      FROM gremia_br_workspace_actions a
      LEFT JOIN generated_documents d ON d.id = a.local_document_id
      WHERE a.action_type = 'document_uploaded' AND a.status = 'uploaded' AND a.remote_document_id IS NOT NULL
      GROUP BY a.remote_document_id
      ORDER BY MAX(a.created_at) DESC
    `).all().map((row) => ({ remoteDocumentId: row.remote_document_id, title: row.title ?? 'Übertragenes Dokument' }));
  }

  private assertOwned(documentId: string): string {
    const id = required(documentId, 'ein übertragenes Dokument');
    const owned = this.getDatabase().prepare<{ id: string }>(`
      SELECT id FROM gremia_br_workspace_actions
      WHERE remote_document_id = ? AND action_type = 'document_uploaded' AND status = 'uploaded'
      LIMIT 1
    `).get(id);
    if (!owned) throw new ApplicationError('PERMISSION_DENIED', 'Nur selbst übertragene Gremia.BR-Dokumente können hier verwaltet werden.');
    return id;
  }

  async list(documentId: string): Promise<GremiaBrOwnShare[]> {
    const id = this.assertOwned(documentId);
    const response = await this.auth.get<unknown>(`/api/v1/documents/${encodeURIComponent(id)}/shares`);
    if (!Array.isArray(response)) throw new ApplicationError('REMOTE_READ_FAILED', 'Gremia.BR-Freigaben konnten nicht gelesen werden.');
    return response.map((value) => parseShare(value, id));
  }

  async create(input: GremiaBrShareCreateInput): Promise<GremiaBrOwnShare> {
    const id = this.assertOwned(input.documentId);
    const targetSecurityDomain = required(input.targetSecurityDomain, 'den Ziel-Sicherheitsbereich');
    const purpose = required(input.purpose, 'den Freigabezweck');
    if (purpose.length > 1024) throw new ApplicationError('VALIDATION_FAILED', 'Der Freigabezweck darf höchstens 1024 Zeichen enthalten.');
    const validUntil = required(input.validUntil, 'ein Ablaufdatum');
    if (!Number.isFinite(Date.parse(validUntil))) throw new ApplicationError('VALIDATION_FAILED', 'Bitte ein gültiges Ablaufdatum angeben.');
    const soloJustification = input.soloJustification?.trim();
    const response = await this.auth.post<unknown>(`/api/v1/documents/${encodeURIComponent(id)}/shares`, {
      body: { targetSecurityDomain, purpose, validUntil, ...(soloJustification ? { soloJustification } : {}) },
    });
    return parseShare(response, id);
  }

  async revoke(input: GremiaBrShareRevokeInput): Promise<GremiaBrOwnShare> {
    const id = this.assertOwned(input.documentId);
    const shareId = required(input.shareId, 'eine Freigabe');
    const reason = required(input.reason, 'einen Widerrufsgrund');
    if (reason.length > 1024) throw new ApplicationError('VALIDATION_FAILED', 'Der Widerrufsgrund darf höchstens 1024 Zeichen enthalten.');
    const shares = await this.list(id);
    if (!shares.some((share) => share.id === shareId && ['ACTIVE', 'REQUESTED'].includes(share.status))) {
      throw new ApplicationError('CONFLICT', 'Diese Freigabe ist nicht mehr widerrufbar. Bitte die Freigaben bewusst neu abrufen.');
    }
    const response = await this.auth.post<unknown>(`/api/v1/documents/shares/${encodeURIComponent(shareId)}/revocation`, { body: { reason } });
    return parseShare(response, id);
  }
}
