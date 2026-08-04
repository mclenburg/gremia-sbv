import type { DatabaseAdapter } from './databaseService.js';
import { ensurePersonalDataAuditSchema } from './auditLogService.js';
import { ensureComplianceIncidentSchema } from './complianceIncidentService.js';
import { ActivityJournalPreferenceService } from './activityJournalPreferenceService.js';
import { ActivityJournalService } from './activityJournalService.js';
import { CaseMeasureService } from './caseMeasureService.js';
import { ParticipationService } from './participationService.js';
import { RecruitingParticipationService } from './recruitingParticipationService.js';
import { SbvControlProtocolService } from './sbvControlProtocolService.js';
import { SbvParticipationViolationService } from './sbvParticipationViolationService.js';
import { SbvParticipationViolationDocumentService } from './sbvParticipationViolationDocumentService.js';
import { SbvResourceService } from './sbvResourceService.js';
import { WorkplaceAccommodationService } from './workplaceAccommodationService.js';
import { MeasureLifecycleAuditService } from './measureLifecycleAuditService.js';
import type { ReportableMeasureType } from '../src/app/core/models/measure-lifecycle.model.js';

/**
 * Runs database compatibility initialization exactly once after SQL migrations.
 *
 * Historical service-local guards are intentionally invoked here while their SQL
 * is gradually folded into versioned migration files. Fachservice constructors
 * must remain side-effect free and may assume this initializer has completed.
 */
export class DatabaseRuntimeInitializer {
  constructor(private readonly db: DatabaseAdapter) {}

  initialize(): { baselineEntriesCreated: number } {
    ensurePersonalDataAuditSchema(this.db);
    ensureComplianceIncidentSchema(this.db);

    new ActivityJournalPreferenceService(this.db).ensureSchema();
    new ActivityJournalService(this.db).ensureSchema();
    new CaseMeasureService(this.db).ensureSchema();
    new ParticipationService(this.db).ensureSchema();
    new RecruitingParticipationService(this.db).ensureSchema();
    new SbvControlProtocolService(this.db).ensureSchema();
    new SbvParticipationViolationService(this.db).ensureSchema();
    new SbvParticipationViolationDocumentService(this.db, () => '').ensureSchema();
    new SbvResourceService(this.db).ensureSchema();
    new WorkplaceAccommodationService(this.db).ensureSchema();

    return { baselineEntriesCreated: this.ensureMeasureLifecycleBaselines() };
  }

  private ensureMeasureLifecycleBaselines(): number {
    const lifecycle = new MeasureLifecycleAuditService(this.db);
    let created = 0;
    created += lifecycle.ensureBaselineForTable({
      table: 'case_measures',
      measureType: 'other',
      statusColumn: 'status',
      caseColumn: 'case_id',
      typeColumn: 'type',
      typeMap: (value) => value as ReportableMeasureType,
    });
    created += lifecycle.ensureBaselineForTable({ table: 'bem_processes', measureType: 'bem', statusColumn: 'status', caseColumn: 'case_id' });
    created += lifecycle.ensureBaselineForTable({ table: 'prevention_processes', measureType: 'prevention', statusColumn: 'status', caseColumn: 'case_id' });
    created += lifecycle.ensureBaselineForTable({ table: 'equalization_processes', measureType: 'equalization_gdb', statusColumn: 'application_status', caseColumn: 'case_id' });
    created += lifecycle.ensureBaselineForTable({ table: 'termination_hearings', measureType: 'termination_hearing', statusColumn: 'status', caseColumn: 'case_id' });
    created += lifecycle.ensureBaselineForTable({ table: 'recruiting_participations', measureType: 'recruiting', statusColumn: 'status' });
    return created;
  }
}
