import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService.js';
import { ActivityJournalPreferenceService } from '../services/activityJournalPreferenceService.js';
import { ActivityJournalService } from '../services/activityJournalService.js';
import { PersonalDataAuditLogService } from '../services/auditLogService.js';
import { BemService } from '../services/bemService.js';
import { CaseMeasureService } from '../services/caseMeasureService.js';
import { ComplianceIncidentService } from '../services/complianceIncidentService.js';
import { DeadlineService } from '../services/deadlineService.js';
import { EqualizationService } from '../services/equalizationService.js';
import { ParticipationService } from '../services/participationService.js';
import { PreventionService } from '../services/preventionService.js';
import { RecruitingParticipationService } from '../services/recruitingParticipationService.js';
import { SbvControlProtocolService } from '../services/sbvControlProtocolService.js';
import { SbvParticipationViolationService } from '../services/sbvParticipationViolationService.js';
import { SbvParticipationViolationDocumentService } from '../services/sbvParticipationViolationDocumentService.js';
import { SbvResourceService } from '../services/sbvResourceService.js';
import { TerminationService } from '../services/terminationService.js';
import { WorkplaceAccommodationService } from '../services/workplaceAccommodationService.js';

function databaseThatRejectsAccess(): DatabaseAdapter {
  return new Proxy({} as DatabaseAdapter, {
    get(_target, property) {
      throw new Error(`Database access during service construction: ${String(property)}`);
    },
  });
}

describe('database-bound service construction', () => {
  it('does not read or mutate the database', () => {
    const db = databaseThatRejectsAccess();
    const factories = [
      () => new ActivityJournalPreferenceService(db),
      () => new ActivityJournalService(db),
      () => new PersonalDataAuditLogService(db),
      () => new BemService(db),
      () => new CaseMeasureService(db),
      () => new ComplianceIncidentService(db),
      () => new DeadlineService(db),
      () => new EqualizationService(db),
      () => new ParticipationService(db),
      () => new PreventionService(db),
      () => new RecruitingParticipationService(db),
      () => new SbvControlProtocolService(db),
      () => new SbvParticipationViolationService(db),
      () => new SbvParticipationViolationDocumentService(db, () => ''),
      () => new SbvResourceService(db),
      () => new TerminationService(db),
      () => new WorkplaceAccommodationService(db),
    ];

    expect(() => factories.forEach((factory) => factory())).not.toThrow();
  });
});
