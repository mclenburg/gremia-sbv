import type { DatabaseAdapter } from '../services/databaseService.js';
import { ActivityJournalPreferenceService } from '../services/activityJournalPreferenceService.js';
import { ActivityJournalService } from '../services/activityJournalService.js';
import { PersonalDataAuditLogService } from '../services/auditLogService.js';
import { BackupService } from '../services/backupService.js';
import { BemService } from '../services/bemService.js';
import { CaseHandoverService } from '../services/caseHandoverService.js';
import { CaseMeasureService } from '../services/caseMeasureService.js';
import { CaseService } from '../services/caseService.js';
import { ComplianceIncidentService } from '../services/complianceIncidentService.js';
import { ComplianceSelfCheckService } from '../services/complianceSelfCheckService.js';
import { ContactService } from '../services/contactService.js';
import { DeadlineService } from '../services/deadlineService.js';
import { DsarPrefillService } from '../services/dsarPrefillService.js';
import { EqualizationService } from '../services/equalizationService.js';
import { GremiaBrAuthService } from '../services/gremiaBr/gremiaBrAuthService.js';
import { GremiaBrCacheService } from '../services/gremiaBr/gremiaBrCacheService.js';
import { GremiaBrExternalReferenceService } from '../services/gremiaBr/gremiaBrExternalReferenceService.js';
import { GremiaBrSettingsService } from '../services/gremiaBr/gremiaBrSettingsService.js';
import { KnowledgeService } from '../services/knowledgeService.js';
import { ParticipationService } from '../services/participationService.js';
import { PersonAnonymizationService } from '../services/personAnonymizationService.js';
import { PersonImportService } from '../services/personImportService.js';
import { PersonStatusExpiryService } from '../services/personStatusExpiryService.js';
import { PreventionService } from '../services/preventionService.js';
import { PrivacyReviewService } from '../services/privacyReviewService.js';
import { ProtectedPersonService } from '../services/protectedPersonService.js';
import { RecruitingParticipationService } from '../services/recruitingParticipationService.js';
import { ReportService } from '../services/reportService.js';
import { RetentionService } from '../services/retentionService.js';
import { SbvControlProtocolService } from '../services/sbvControlProtocolService.js';
import { SbvParticipationViolationDocumentService } from '../services/sbvParticipationViolationDocumentService.js';
import { SbvParticipationViolationService } from '../services/sbvParticipationViolationService.js';
import { SbvParticipationViolationTemplateService } from '../services/sbvParticipationViolationTemplateService.js';
import { SbvResourceService } from '../services/sbvResourceService.js';
import type { SecurityService } from '../services/securityService.js';
import { TemplateDefaultService } from '../services/templateDefaultService.js';
import { TemplateService } from '../services/templateService.js';
import { TerminationService } from '../services/terminationService.js';
import { WorkplaceAccommodationService } from '../services/workplaceAccommodationService.js';

/**
 * Central composition root for Electron main-process application services.
 *
 * Database-bound services are created at most once per active DatabaseAdapter.
 * Provider-based services are stable singletons and resolve the active vault lazily.
 * No schema or lifecycle policy is moved here; this patch only centralizes ownership.
 */
export class DatabaseScopedServiceCache {
  private readonly servicesByDatabase = new WeakMap<object, Map<string, unknown>>();

  get<T>(database: object, key: string, factory: () => T): T {
    let services = this.servicesByDatabase.get(database);
    if (!services) {
      services = new Map<string, unknown>();
      this.servicesByDatabase.set(database, services);
    }
    const existing = services.get(key);
    if (existing !== undefined) return existing as T;
    const created = factory();
    services.set(key, created);
    return created;
  }
}

export class ApplicationServices {
  private readonly databaseScoped = new DatabaseScopedServiceCache();

  readonly backup: BackupService;
  readonly cases: CaseService;
  readonly caseHandover: CaseHandoverService;
  readonly contacts: ContactService;
  readonly knowledge: KnowledgeService;
  readonly reports: ReportService;
  readonly retention: RetentionService;
  readonly templates: TemplateService;
  readonly templateDefaults: TemplateDefaultService;
  readonly gremiaBrSettings: GremiaBrSettingsService;
  readonly gremiaBrAuth: GremiaBrAuthService;
  readonly gremiaBrCache: GremiaBrCacheService;
  readonly gremiaBrReferences: GremiaBrExternalReferenceService;
  readonly participationViolationTemplates: SbvParticipationViolationTemplateService;

  constructor(
    readonly security: SecurityService,
    private readonly dataDirectoryProvider: () => string,
  ) {
    const databaseProvider = () => security.getActiveDatabase();
    const auditProvider = () => this.auditLog();

    this.backup = new BackupService(security);
    this.cases = new CaseService(databaseProvider, () => security.getDataDirectory());
    this.caseHandover = new CaseHandoverService(databaseProvider, () => security.getDataDirectory());
    this.contacts = new ContactService(databaseProvider);
    this.knowledge = new KnowledgeService(databaseProvider);
    this.reports = new ReportService(databaseProvider, () => security.getDataDirectory());
    this.retention = new RetentionService(databaseProvider, () => security.getDataDirectory());
    this.templates = new TemplateService(databaseProvider);
    this.templateDefaults = new TemplateDefaultService(databaseProvider);
    this.gremiaBrSettings = new GremiaBrSettingsService(databaseProvider, () => security.getActiveDatabaseKey());
    this.gremiaBrAuth = new GremiaBrAuthService(this.gremiaBrSettings, undefined, auditProvider);
    this.gremiaBrCache = new GremiaBrCacheService(databaseProvider);
    this.gremiaBrReferences = new GremiaBrExternalReferenceService(databaseProvider);
    this.participationViolationTemplates = new SbvParticipationViolationTemplateService();
  }

  private databaseService<T>(key: string, factory: (database: DatabaseAdapter) => T): T {
    const database = this.security.getActiveDatabase();
    return this.databaseScoped.get(database, key, () => factory(database));
  }

  auditLog = (): PersonalDataAuditLogService =>
    this.databaseService('auditLog', (database) => new PersonalDataAuditLogService(database));
  activityJournal = (): ActivityJournalService =>
    this.databaseService('activityJournal', (database) => new ActivityJournalService(database));
  activityJournalPreferences = (): ActivityJournalPreferenceService =>
    this.databaseService('activityJournalPreferences', (database) => new ActivityJournalPreferenceService(database));
  bem = (): BemService => this.databaseService('bem', (database) => new BemService(database));
  caseMeasures = (): CaseMeasureService =>
    this.databaseService('caseMeasures', (database) => new CaseMeasureService(database));
  complianceIncidents = (): ComplianceIncidentService =>
    this.databaseService('complianceIncidents', (database) => new ComplianceIncidentService(database));
  complianceSelfCheck = (): ComplianceSelfCheckService =>
    this.databaseService('complianceSelfCheck', (database) => new ComplianceSelfCheckService(database));
  deadlines = (): DeadlineService =>
    this.databaseService('deadlines', (database) => new DeadlineService(database));
  dsarPrefill = (): DsarPrefillService =>
    this.databaseService('dsarPrefill', (database) => new DsarPrefillService(database));
  equalization = (): EqualizationService =>
    this.databaseService('equalization', (database) => new EqualizationService(database));
  participation = (): ParticipationService =>
    this.databaseService('participation', (database) => new ParticipationService(database));
  personAnonymization = (): PersonAnonymizationService =>
    this.databaseService('personAnonymization', (database) => new PersonAnonymizationService(database));
  personImport = (): PersonImportService =>
    this.databaseService('personImport', (database) => new PersonImportService(database));
  personStatusExpiry = (): PersonStatusExpiryService =>
    this.databaseService('personStatusExpiry', (database) => new PersonStatusExpiryService(database));
  prevention = (): PreventionService =>
    this.databaseService('prevention', (database) => new PreventionService(database));
  privacyReviews = (): PrivacyReviewService =>
    this.databaseService('privacyReviews', (database) => new PrivacyReviewService(database));
  protectedPersons = (): ProtectedPersonService =>
    this.databaseService('protectedPersons', (database) => new ProtectedPersonService(database));
  recruitingParticipation = (): RecruitingParticipationService =>
    this.databaseService('recruitingParticipation', (database) => new RecruitingParticipationService(database));
  sbvControlProtocols = (): SbvControlProtocolService =>
    this.databaseService('sbvControlProtocols', (database) => new SbvControlProtocolService(database));
  sbvParticipationViolations = (): SbvParticipationViolationService =>
    this.databaseService('sbvParticipationViolations', (database) => new SbvParticipationViolationService(database));
  sbvParticipationViolationDocuments = (): SbvParticipationViolationDocumentService =>
    this.databaseService(
      'sbvParticipationViolationDocuments',
      (database) => new SbvParticipationViolationDocumentService(database, this.dataDirectoryProvider),
    );
  sbvResources = (): SbvResourceService =>
    this.databaseService('sbvResources', (database) => new SbvResourceService(database));
  termination = (): TerminationService =>
    this.databaseService('termination', (database) => new TerminationService(database));
  workplaceAccommodation = (): WorkplaceAccommodationService =>
    this.databaseService('workplaceAccommodation', (database) => new WorkplaceAccommodationService(database));
}
