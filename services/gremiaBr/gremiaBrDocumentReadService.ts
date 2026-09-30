import { createHash } from 'node:crypto';
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
    let rawSignatures: unknown;
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

    const currentVersionId = text(detail.currentVersionId);
    if (currentVersionId) {
      if (!rawVersions.some((value) => gremiaBrRecord(value)?.id === currentVersionId)) throw readFailed();
      try {
        rawSignatures = await this.auth.get<unknown>(`/api/v1/documents/versions/${encodeURIComponent(currentVersionId)}/signatures`);
      } catch { throw readFailed(); }
      if (!Array.isArray(rawSignatures)) throw readFailed();
    }

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
    const signatures = currentVersionId ? {
      requested: 0, signed: 0, declined: 0, cancelled: 0, expired: 0, verificationFailed: 0,
    } : undefined;
    if (signatures) for (const value of rawSignatures as unknown[]) {
      const signature = gremiaBrRecord(value);
      if (!signature || signature.documentVersionId !== currentVersionId || !text(signature.id)
        || !['REQUESTED', 'SIGNED', 'DECLINED', 'CANCELLED', 'EXPIRED'].includes(text(signature.state))
        || !['NOT_APPLICABLE', 'PENDING', 'VERIFIED', 'FAILED'].includes(text(signature.verificationState))) throw readFailed();
      if (signature.state === 'REQUESTED') signatures.requested += 1;
      if (signature.state === 'SIGNED') signatures.signed += 1;
      if (signature.state === 'DECLINED') signatures.declined += 1;
      if (signature.state === 'CANCELLED') signatures.cancelled += 1;
      if (signature.state === 'EXPIRED') signatures.expired += 1;
      if (signature.verificationState === 'FAILED') signatures.verificationFailed += 1;
    }
    return {
      id, title: text(metadata?.title) || text(metadata?.filename) || 'Dokument ohne Titel',
      ...(text(metadata?.description) ? { description: text(metadata?.description) } : {}),
      protectionClass: text(detail.protectionClass), status: text(detail.status),
      ...(text(detail.currentVersionId) ? { currentVersionId: text(detail.currentVersionId) } : {}),
      versions, shares,
      ...(signatures ? { signatures } : {}),
    };
  }

  async readVersionForPreview(documentId: string, versionId: string): Promise<{ filename: string; content: Buffer }> {
    const id = text(documentId);
    const selectedVersionId = text(versionId);
    if (!id || !selectedVersionId) throw new ApplicationError('VALIDATION_FAILED', 'Bitte eine Dokumentversion auswählen.');
    let rawVersions: unknown;
    try {
      rawVersions = await this.auth.get<unknown>(`/api/v1/documents/${encodeURIComponent(id)}/versions`);
    } catch { throw readFailed(); }
    if (!Array.isArray(rawVersions)) throw readFailed();
    const version = rawVersions.map(gremiaBrRecord).find((item) => item?.id === selectedVersionId && item.documentId === id);
    const metadata = gremiaBrRecord(version?.metadata);
    const filename = text(metadata?.filename);
    const mimeType = text(metadata?.mimeType);
    const digest = text(metadata?.plaintextDigest).toLowerCase();
    if (!version || version.processingState !== 'READY' || !filename || !['application/pdf', 'image/png', 'image/jpeg', 'text/plain'].includes(mimeType)
      || !/^[0-9a-f]{64}$/.test(digest)) {
      throw new ApplicationError('REMOTE_READ_FAILED', 'Diese Dokumentversion ist für eine sichere Vorschau nicht verfügbar. Bitte eine andere Version wählen.');
    }
    let payload: unknown;
    try {
      payload = await this.auth.get<Uint8Array>(`/api/v1/documents/versions/${encodeURIComponent(selectedVersionId)}/content`, { responseType: 'bytes' });
    } catch { throw readFailed(); }
    if (!(payload instanceof Uint8Array)) throw readFailed();
    const content = Buffer.from(payload);
    if (createHash('sha256').update(content).digest('hex') !== digest) {
      content.fill(0);
      throw new ApplicationError('REMOTE_READ_FAILED', 'Die Integrität der Dokumentversion konnte nicht bestätigt werden. Die Vorschau wurde nicht geöffnet.');
    }
    if (mimeType === 'application/pdf' && content.subarray(0, 5).toString('ascii') !== '%PDF-') {
      content.fill(0);
      throw new ApplicationError('REMOTE_READ_FAILED', 'Die Dokumentversion entspricht nicht dem angegebenen Dateityp. Die Vorschau wurde nicht geöffnet.');
    }
    return { filename, content };
  }
}
