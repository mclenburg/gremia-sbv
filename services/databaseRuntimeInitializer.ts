import type { DatabaseAdapter } from './databaseService.js';
import { MeasureLifecycleAuditService } from './measureLifecycleAuditService.js';
import { KnowledgeService } from './knowledgeService.js';
import { TemplateService } from './templateService.js';
import type { ReportableMeasureType } from '../src/domain/models/measure-lifecycle.model.js';
import { DomainAggregateIntegrityService } from './domainAggregateIntegrityService.js';
import { TransferInstanceIdentityService } from './transferInstanceIdentityService.js';
import { APP_SCHEMA_VERSION } from './appSchema.js';

const MEASURE_BASELINE_KEY = 'database.runtime.measureBaselineVersion';

/**
 * Runs data-only initialization after the versioned structural migrations.
 *
 * This class must never create, alter or drop database structures. Structural
 * compatibility belongs exclusively to MigrationService and its versioned hooks.
 */
export class DatabaseRuntimeInitializer {
  constructor(private readonly database: DatabaseAdapter) {}

  initialize(options: { deferAggregateIntegrity?: boolean } = {}): { baselineEntriesCreated: number; aggregateExtensionsChecked: number; transferIdentityEnsured: boolean } {
    const aggregateExtensionsChecked = options.deferAggregateIntegrity ? 0 : new DomainAggregateIntegrityService(this.database).verify().checkedExtensions;
    new KnowledgeService(this.database).seedReferenceData(this.database);
    new TemplateService(this.database).seedReferenceData(this.database);
    new TransferInstanceIdentityService(this.database).ensureIdentity();
    return { baselineEntriesCreated: this.ensureMeasureLifecycleBaselinesOnce(), aggregateExtensionsChecked, transferIdentityEnsured: true };
  }

  private ensureMeasureLifecycleBaselinesOnce(): number {
    const recorded = this.database.prepare<{ value: string }>('SELECT value FROM settings WHERE key = ?').get(MEASURE_BASELINE_KEY)?.value;
    if (recorded === APP_SCHEMA_VERSION) return 0;
    const created = this.ensureMeasureLifecycleBaselines();
    this.database.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(MEASURE_BASELINE_KEY, APP_SCHEMA_VERSION, new Date().toISOString());
    return created;
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
