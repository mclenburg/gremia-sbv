import type { GremiaBrAuthService } from './gremiaBrAuthService.js';
import type { CaseService } from '../caseService.js';
import type { SecurityService } from '../securityService.js';
import type { CaseDocumentRecord } from '../../src/domain/models/case-document.model.js';
import type { GremiaBrDocumentImportInput } from '../../src/domain/models/gremia-br.model.js';
import { ApplicationError } from '../../src/domain/models/application-error.model.js';
import { GremiaBrDocumentReadService } from './gremiaBrDocumentReadService.js';

export class GremiaBrDocumentImportService {
  constructor(
    private readonly auth: GremiaBrAuthService,
    private readonly cases: Pick<CaseService, 'importDocument'>,
    private readonly security: Pick<SecurityService, 'writeTemporaryFile' | 'cleanupTemporaryFiles'>,
  ) {}

  async importToCase(input: GremiaBrDocumentImportInput): Promise<CaseDocumentRecord> {
    if (!input.documentId?.trim() || !input.versionId?.trim() || !input.caseId?.trim() || !input.title?.trim()
      || typeof input.containsHealthData !== 'boolean') {
      throw new ApplicationError('VALIDATION_FAILED', 'Bitte Dokumentversion und Zielfall vor der Übernahme auswählen.');
    }
    const version = await new GremiaBrDocumentReadService(this.auth).readVersionForPreview(input.documentId, input.versionId);
    try {
      const filePath = this.security.writeTemporaryFile('document-preview', version.filename, version.content, 'import');
      return await this.cases.importDocument(input.caseId, filePath, input.containsHealthData, undefined, {
        documentId: input.documentId,
        versionId: input.versionId,
        title: input.title,
      });
    } finally {
      version.content.fill(0);
      this.security.cleanupTemporaryFiles();
    }
  }
}
