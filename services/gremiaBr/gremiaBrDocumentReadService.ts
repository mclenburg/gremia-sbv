import type { GremiaBrAuthService } from './gremiaBrAuthService.js';
import type { GremiaBrDocumentDetail, GremiaBrDocumentHit } from '../../src/domain/models/gremia-br.model.js';
import { ApplicationError } from '../../src/domain/models/application-error.model.js';
import { gremiaBrRecord } from './gremiaBrPayload.js';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readFailed(): ApplicationError {
  return new ApplicationError('REMOTE_READ_FAILED', 'Gremia.BR-Dokumente konnten nicht geladen werden. Bitte den Abruf erneut versuchen.');
}

export class GremiaBrDocumentReadService {
  constructor(private readonly auth: Pick<GremiaBrAuthService, 'get' | 'post' | 'getReadContext'>) {}

  async search(query: string): Promise<GremiaBrDocumentHit[]> {
    const normalized = text(query);
    if (!normalized || normalized.length > 512) throw new ApplicationError('VALIDATION_FAILED', 'Bitte einen Suchbegriff mit höchstens 512 Zeichen eingeben.');
    const context = this.auth.getReadContext();
    if (!context.selectedOrganizationId || !context.selectedSecurityDomain) {
      throw new ApplicationError('VALIDATION_FAILED', 'Bitte zuerst einen berechtigten Sicherheitsbereich in den Gremia.BR-Einstellungen auswählen.');
    }
    let payload: unknown;
    try {
      payload = await this.auth.post<unknown>('/api/v1/documents/search', {
        body: { organizationId: context.selectedOrganizationId, securityDomain: context.selectedSecurityDomain, query: normalized, limit: 25 },
      });
    } catch { throw readFailed(); }
    const response = gremiaBrRecord(payload);
    if (!response || !Array.isArray(response.hits) || !Number.isInteger(response.total)) throw readFailed();
    return response.hits.map((value): GremiaBrDocumentHit => {
      const hit = gremiaBrRecord(value);
      const metadata = gremiaBrRecord(hit?.metadata);
      if (!text(hit?.documentId) || !text(hit?.documentVersionId)) throw readFailed();
      return {
        documentId: text(hit?.documentId),
        documentVersionId: text(hit?.documentVersionId),
        title: text(metadata?.title) || text(metadata?.filename) || 'Dokument ohne Titel',
        filename: text(metadata?.filename),
      };
    });
  }

  async getDetail(documentId: string): Promise<GremiaBrDocumentDetail> {
    const id = text(documentId);
    if (!id) throw new ApplicationError('VALIDATION_FAILED', 'Bitte ein Dokument auswählen.');
    let rawDetail: unknown;
    let rawVersions: unknown;
    let rawShares: unknown;
    try {
      rawDetail = await this.auth.get<unknown>(`/api/v1/documents/${encodeURIComponent(id)}`);
      rawVersions = await this.auth.get<unknown>(`/api/v1/documents/${encodeURIComponent(id)}/versions`);
      rawShares = await this.auth.get<unknown>(`/api/v1/documents/${encodeURIComponent(id)}/shares`);
    } catch { throw readFailed(); }
    const detail = gremiaBrRecord(rawDetail);
    const currentVersion = gremiaBrRecord(detail?.currentVersion);
    const metadata = gremiaBrRecord(currentVersion?.metadata);
    if (!detail || detail.id !== id || !text(detail.protectionClass) || !text(detail.status)
      || !Array.isArray(rawVersions) || !Array.isArray(rawShares)) throw readFailed();

    const versions = rawVersions.map((value) => {
      const version = gremiaBrRecord(value);
      const versionMetadata = gremiaBrRecord(version?.metadata);
      if (!version || version.documentId !== id || !text(version.id) || !Number.isInteger(version.versionNumber)
        || !Number.isInteger(version.byteSize) || !text(version.processingState)) throw readFailed();
      return {
        id: text(version.id), versionNumber: version.versionNumber as number,
        filename: text(versionMetadata?.filename), mimeType: text(versionMetadata?.mimeType),
        byteSize: version.byteSize as number, processingState: text(version.processingState),
      };
    });
    const shares = rawShares.map((value) => {
      const share = gremiaBrRecord(value);
      if (!share || !text(share.id) || !text(share.status) || !text(share.targetSecurityDomain)
        || !text(share.validUntil) || !text(share.requirement)) throw readFailed();
      return {
        id: text(share.id), status: text(share.status), targetSecurityDomain: text(share.targetSecurityDomain),
        validUntil: text(share.validUntil), requirement: text(share.requirement),
      };
    });
    return {
      id, title: text(metadata?.title) || text(metadata?.filename) || 'Dokument ohne Titel',
      ...(text(metadata?.description) ? { description: text(metadata?.description) } : {}),
      protectionClass: text(detail.protectionClass), status: text(detail.status),
      ...(text(detail.currentVersionId) ? { currentVersionId: text(detail.currentVersionId) } : {}),
      versions, shares,
    };
  }
}
