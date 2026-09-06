import type { DatabaseAdapter } from './databaseService.js';
import { MeasureLifecycleAuditService } from './measureLifecycleAuditService.js';
import { KnowledgeService } from './knowledgeService.js';
import { TemplateService } from './templateService.js';
import type { ReportableMeasureType } from '../src/domain/models/measure-lifecycle.model.js';
import { DomainAggregateIntegrityService } from './domainAggregateIntegrityService.js';
import { TransferInstanceIdentityService } from './transferInstanceIdentityService.js';

/**
 * Runs data-only initialization after the versioned structural migrations.
 *
 * This class must never create, alter or drop database structures. Structural
 * compatibility belongs exclusively to MigrationService and its versioned hooks.
 */
export class DatabaseRuntimeInitializer {
  constructor(private readonly database: DatabaseAdapter) {}

  initialize(): { baselineEntriesCreated: number; aggregateExtensionsChecked: number; transferIdentityEnsured: boolean } {
    const aggregateExtensionsChecked = new DomainAggregateIntegrityService(this.database).verify().checkedExtensions;
    new KnowledgeService(this.database).seedReferenceData(this.database);
    new TemplateService(this.database).seedReferenceData(this.database);
    new TransferInstanceIdentityService(this.database).ensureIdentity();
    return { baselineEntriesCreated: this.ensureMeasureLifecycleBaselines(), aggregateExtensionsChecked, transferIdentityEnsured: true };
  }

  private ensureMeasureLifecycleBaselines(): number {
    const lifecycle = new MeasureLifecycleAuditService(this.database);
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
