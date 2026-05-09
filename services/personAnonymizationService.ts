import type { DatabaseAdapter } from './databaseService.js';
import { ProtectedPersonService } from './protectedPersonService.js';
import type { PersonAnonymizationResult } from '../src/app/core/models/protected-person.model.js';

export class PersonAnonymizationService {
  constructor(private readonly db: DatabaseAdapter) {}

  anonymizeStructuredPersonData(id: string, reason: string): PersonAnonymizationResult {
    if (!reason.trim()) throw new Error('Für die Anonymisierung ist ein Grund erforderlich.');
    const service = new ProtectedPersonService(this.db);
    const linksBefore = service.listCaseLinks(id).filter((link) => link.linkState === 'active');
    const person = service.anonymizeStructuredData(id, reason.trim());
    return {
      person,
      affectedCaseIds: linksBefore.map((link) => link.caseFileId),
      anonymizedLinks: linksBefore.length
    };
  }
}
