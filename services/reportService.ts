import { ComplianceReportBuilders } from './reports/complianceReportBuilders.js';
import type { GenerateReportInput } from '../src/app/core/models/report.model.js';
import type { ReportBuildResult } from './reports/reportSupport.js';

export class ReportService extends ComplianceReportBuilders {
  build(input: GenerateReportInput): ReportBuildResult {
      switch (input.type) {
        case "activity":
          return this.buildActivityReport(input);
        case "privacy_audit":
          return this.buildPrivacyAudit(input);
        case "case_deadline_controlling":
          return this.buildControllingReport(input);
        case "bem_prevention":
          return this.buildBemPreventionReport(input);
        case "termination_hearings":
          return this.buildTerminationReport(input);
        case "sbv_participation":
          return this.buildParticipationReport(input);
        case "equalization_gdb":
          return this.buildEqualizationReport(input);
        case "retention_cleanup":
          return this.buildRetentionCleanupReport(input);
        case "audit_log":
          return this.buildAuditLogReport(input);
        case "system_integrity":
          return this.buildSystemIntegrityReport(input);
        case "compliance_document":
          return this.buildComplianceDocumentReport(input);
        default:
          throw new Error("Unbekannter Berichtstyp.");
      }
    }
}
