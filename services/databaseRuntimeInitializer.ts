import type { DatabaseAdapter } from './databaseService.js';
import { MeasureLifecycleAuditService } from './measureLifecycleAuditService.js';
import { KnowledgeService } from './knowledgeService.js';
import { TemplateService } from './templateService.js';
import type { ReportableMeasureType } from '../src/app/core/models/measure-lifecycle.model.js';
import { DomainAggregateIntegrityService } from './domainAggregateIntegrityService.js';

/**
 * Runs data-only initialization after the versioned structural migrations.
 *
 * This class must never create, alter or drop database structures. Structural
 * compatibility belongs exclusively to MigrationService and its versioned hooks.
 */
export class DatabaseRuntimeInitializer {
  constructor(private readonly db: DatabaseAdapter) {}

  initialize(): { baselineEntriesCreated: number; aggregateExtensionsChecked: number } {
    const aggregateExtensionsChecked = new DomainAggregateIntegrityService(this.db).verify().checkedExtensions;
    new KnowledgeService(() => this.db).seedReferenceData(this.db);
    new TemplateService(() => this.db).seedReferenceData(this.db);
    return { baselineEntriesCreated: this.ensureMeasureLifecycleBaselines(), aggregateExtensionsChecked };
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
