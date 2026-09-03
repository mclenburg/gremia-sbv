import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { MigrationRepairValidation } from './migrations/migrationRepairValidation.js';

class RuntimeSchemaCompatibility extends MigrationRepairValidation {
  constructor(database: DatabaseAdapter) {
    super(database, path.join(process.cwd(), 'database/schema.sql'), path.join(process.cwd(), 'database/migrations'));
  }

  contacts(): void { this.ensureContactsSchema(); }
  personalDataAudit(): void { this.ensurePersonalDataAuditLogSchema(); }
  activityJournal(): void { this.ensureActivityJournalSchema(); }
  caseMeasures(): void { this.ensureCaseMeasureSchema(); }
  caseMeasureNotes(): void { this.ensureCaseMeasureNoteSchema(); }
  caseHandover(): void { this.ensureCaseHandoverSchema(); }
  documentOcr(): void { this.ensureDocumentOcrSchema(); }
  protectedPersonBinding(): void { this.ensureProtectedPerson091Schema(); }
  recruitingParticipation(): void { this.ensureRecruitingParticipationSchema(); }
  sbvControlProtocol(): void { this.ensureSbvControlProtocolSchema(); }
  workplaceAccommodation(): void { this.ensureWorkplaceAccommodationSchema(); }
  retention(): void { this.ensureRetentionActionsSchema(); }
  reports(): void { this.ensureReportExportSchema(); }
  templates(): void { this.ensureTemplateSchema(); }
  knowledge(): void { this.ensureKnowledgeBaseSchema(); }
  privacyReview(): void { this.ensurePrivacyReviewSchema(); }
  sbvResources(): void { this.ensureSbvResourceSchema(); }
  sbvParticipationViolations(): void { this.ensureSbvParticipationViolationSchema(); }
  sbvParticipationViolationDocuments(): void { this.ensureSbvParticipationViolationDocumentSchema(); }
  complianceIncidents(): void { this.ensureComplianceIncidentSchema(); }
}

function compatibility(db: DatabaseAdapter): RuntimeSchemaCompatibility {
  return new RuntimeSchemaCompatibility(db);
}

export function ensureContactsRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).contacts(); }
export function ensurePersonalDataAuditRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).personalDataAudit(); }
export function ensureActivityJournalRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).activityJournal(); }
export function ensureActivityJournalPreferenceRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).activityJournal(); }
export function ensureCaseMeasureRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).caseMeasures(); }
export function ensureCaseHandoverRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).caseHandover(); }
export function ensureDocumentOcrRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).documentOcr(); }
export function ensurePersonCaseBindingRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).protectedPersonBinding(); }
export function ensureRecruitingParticipationRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).recruitingParticipation(); }
export function ensureSbvControlProtocolRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).sbvControlProtocol(); }
export function ensureWorkplaceAccommodationRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).workplaceAccommodation(); }
export function ensureRetentionRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).retention(); }
export function ensureReportRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).reports(); }
export function ensureTemplateRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).templates(); }
export function ensureKnowledgeRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).knowledge(); }
export function ensurePrivacyReviewRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).privacyReview(); }
export function ensureSbvResourceRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).sbvResources(); }
export function ensureSbvParticipationViolationDocumentRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).sbvParticipationViolationDocuments(); }
export function ensureSbvParticipationViolationRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).sbvParticipationViolations(); }
export function ensureComplianceIncidentRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).complianceIncidents(); }
