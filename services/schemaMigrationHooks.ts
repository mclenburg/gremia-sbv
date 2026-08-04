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
import { CaseService } from './caseService.js';
import { CaseHandoverService } from './caseHandoverService.js';
import { ContactService } from './contactService.js';
import { DocumentOcrService } from './documents/documentOcrService.js';
import { KnowledgeService } from './knowledgeService.js';
import { PersonCaseBindingService } from './personCaseBindingService.js';
import { PrivacyReviewService } from './privacyReviewService.js';
import { ReportService } from './reportService.js';
import { RetentionService } from './retentionService.js';
import { SearchIndexService } from './search/searchIndexService.js';
import { TemplateService } from './templateService.js';

export interface SchemaMigrationHook {
  version: string;
  components: readonly string[];
  apply(db: DatabaseAdapter): void;
}

function recordComponent(db: DatabaseAdapter, version: string, component: string): void {
  db.prepare(`
    INSERT OR REPLACE INTO schema_migration_components (migration_version, component, applied_at)
    VALUES (?, ?, ?)
  `).run(version, component, new Date().toISOString());
}

const CONSOLIDATED_COMPONENTS = [
  'personal_data_audit',
  'compliance_incidents',
  'activity_journal_preferences',
  'activity_journal',
  'case_measures',
  'participation',
  'recruiting_participation',
  'sbv_control_protocol',
  'sbv_participation_violations',
  'sbv_participation_violation_documents',
  'sbv_resources',
  'workplace_accommodation',
  'cases_and_fts',
  'case_handover',
  'contacts',
  'document_ocr',
  'knowledge',
  'person_case_binding',
  'privacy_review',
  'reports',
  'retention',
  'search_index',
  'templates',
] as const;

const SCHEMA_MIGRATION_HOOKS: Readonly<Record<string, SchemaMigrationHook>> = {
  '0049': {
    version: '0049',
    components: CONSOLIDATED_COMPONENTS,
    apply(db) {
      ensurePersonalDataAuditSchema(db);
      ensureComplianceIncidentSchema(db);
      new ActivityJournalPreferenceService(db).ensureSchema();
      new ActivityJournalService(db).ensureSchema();
      new CaseMeasureService(db).ensureSchema();
      new ParticipationService(db).ensureSchema();
      new RecruitingParticipationService(db).ensureSchema();
      new SbvControlProtocolService(db).ensureSchema();
      new SbvParticipationViolationService(db).ensureSchema();
      new SbvParticipationViolationDocumentService(db, () => '').ensureSchema();
      new SbvResourceService(db).ensureSchema();
      new WorkplaceAccommodationService(db).ensureSchema();
      new CaseService(() => db).ensureSchema(db);
      new CaseHandoverService(() => db).ensureSchema(db);
      new ContactService(() => db).ensureSchema(db);
      new DocumentOcrService(db).ensureSchema();
      new KnowledgeService(() => db).ensureSchema(db);
      new PersonCaseBindingService(db).ensureSchema();
      new PrivacyReviewService(db).ensureSchema();
      new ReportService(() => db, () => '').ensureSchema();
      new RetentionService(() => db, () => '').ensureSchema(db);
      new SearchIndexService(db).ensureSchema();
      new TemplateService(() => db).ensureSchema(db);
      CONSOLIDATED_COMPONENTS.forEach((component) => recordComponent(db, '0049', component));
    },
  },
};

export function getSchemaMigrationHook(version: string): SchemaMigrationHook | undefined {
  return SCHEMA_MIGRATION_HOOKS[version];
}
