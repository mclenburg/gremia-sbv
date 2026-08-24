import { ActivityJournalPreferenceService, ActivityJournalService, PersonalDataAuditLogService, MeasureLifecycleAuditService, SearchIndexService, BackupService, BemService, CaseAnonymizationService, CaseHandoverService, CaseMeasureService, CaseService, ComplianceIncidentService, ComplianceSelfCheckService, ContactService, DeadlineService, DsarPrefillService, EqualizationService, EqualizationIntakeService, GremiaBrAuthService, GremiaBrCacheService, GremiaBrExternalReferenceService, GremiaBrSettingsService, KnowledgeService, ParticipationService, PersonAnonymizationService, PersonImportService, PersonStatusExpiryService, PreventionService, PrivacyReviewService, ProtectedPersonService, RecruitingParticipationService, ReportService, RetentionService, SbvControlProtocolService, SbvParticipationViolationDocumentService, SbvParticipationViolationService, SbvParticipationViolationTemplateService, SbvResourceService, TemplateDefaultService, TemplateService, TerminationService, WorkplaceAccommodationService, SbvMeetingService, SbvAssemblyService, EmployerObligationService, InclusionAgreementService, ComplaintWorkflowService, SbvOfficeDocumentService, SbvOfficeWorkflowDocumentAdapter, SbvElectionService, SbvElectionDocumentService, ElectionExecutionService, ElectionArchiveService, ElectionTransferService, type DatabaseAdapter, type SecurityService } from './applicationServiceDependencies.js';
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
  readonly caseAnonymization: CaseAnonymizationService;
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
    this.caseAnonymization = new CaseAnonymizationService(databaseProvider, () => security.getDataDirectory());
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
  lifecycleAudit = (): MeasureLifecycleAuditService =>
    this.databaseService('lifecycleAudit', (database) => new MeasureLifecycleAuditService(database, this.auditLog()));
  searchIndex = (): SearchIndexService =>
    this.databaseService('searchIndex', (database) => new SearchIndexService(database));
  activityJournal = (): ActivityJournalService =>
    this.databaseService('activityJournal', (database) => new ActivityJournalService(database));
  activityJournalPreferences = (): ActivityJournalPreferenceService =>
    this.databaseService('activityJournalPreferences', (database) => new ActivityJournalPreferenceService(database));
  bem = (): BemService => this.databaseService('bem', (database) => new BemService(database, this.auditLog(), this.lifecycleAudit(), this.deadlines()));
  caseMeasures = (): CaseMeasureService =>
    this.databaseService('caseMeasures', (database) => new CaseMeasureService(database, this.auditLog(), this.lifecycleAudit(), this.searchIndex()));
  complianceIncidents = (): ComplianceIncidentService =>
    this.databaseService('complianceIncidents', (database) => new ComplianceIncidentService(database));
  complianceSelfCheck = (): ComplianceSelfCheckService =>
    this.databaseService('complianceSelfCheck', (database) => new ComplianceSelfCheckService(database));
  deadlines = (): DeadlineService =>
    this.databaseService('deadlines', (database) => new DeadlineService(database));
  dsarPrefill = (): DsarPrefillService =>
    this.databaseService('dsarPrefill', (database) => new DsarPrefillService(database));
  equalization = (): EqualizationService =>
    this.databaseService('equalization', (database) => new EqualizationService(database, this.auditLog(), this.lifecycleAudit()));
  equalizationIntake = (): EqualizationIntakeService =>
    this.databaseService('equalizationIntake', (database) => new EqualizationIntakeService(
      database,
      this.protectedPersons(),
      this.cases,
      this.equalization(),
    ));
  participation = (): ParticipationService =>
    this.databaseService('participation', (database) => new ParticipationService(database, this.caseMeasures(), this.deadlines(), this.auditLog()));
  personAnonymization = (): PersonAnonymizationService =>
    this.databaseService('personAnonymization', (database) => new PersonAnonymizationService(database));
  personImport = (): PersonImportService =>
    this.databaseService('personImport', (database) => new PersonImportService(database));
  personStatusExpiry = (): PersonStatusExpiryService =>
    this.databaseService('personStatusExpiry', (database) => new PersonStatusExpiryService(database));
  prevention = (): PreventionService =>
    this.databaseService('prevention', (database) => new PreventionService(database, this.auditLog(), this.lifecycleAudit(), this.deadlines()));
  privacyReviews = (): PrivacyReviewService =>
    this.databaseService('privacyReviews', (database) => new PrivacyReviewService(database));
  protectedPersons = (): ProtectedPersonService =>
    this.databaseService('protectedPersons', (database) => new ProtectedPersonService(database));
  recruitingParticipation = (): RecruitingParticipationService =>
    this.databaseService('recruitingParticipation', (database) => new RecruitingParticipationService(database, this.auditLog(), this.lifecycleAudit()));
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
    this.databaseService('termination', (database) => new TerminationService(database, this.auditLog(), this.lifecycleAudit()));
  workplaceAccommodation = (): WorkplaceAccommodationService =>
    this.databaseService('workplaceAccommodation', (database) => new WorkplaceAccommodationService(database, this.caseMeasures(), this.deadlines(), this.auditLog()));
  sbvMeetings = (): SbvMeetingService => this.databaseService('sbvMeetings', (database) => new SbvMeetingService(database, this.deadlines(), this.auditLog()));
  sbvAssemblies = (): SbvAssemblyService => this.databaseService('sbvAssemblies', (database) => new SbvAssemblyService(database, this.auditLog(), this.deadlines()));
  employerObligations = (): EmployerObligationService => this.databaseService('employerObligations', (database) => new EmployerObligationService(database, this.deadlines(), this.auditLog()));
  inclusionAgreements = (): InclusionAgreementService => this.databaseService('inclusionAgreements', (database) => new InclusionAgreementService(database, this.deadlines(), this.auditLog()));
  complaints = (): ComplaintWorkflowService => this.databaseService('complaints', (database) => new ComplaintWorkflowService(database, this.auditLog()));
  sbvOfficeDocuments = (): SbvOfficeDocumentService => this.databaseService('sbvOfficeDocuments', (database) => new SbvOfficeDocumentService(database, new SbvOfficeWorkflowDocumentAdapter(database, this.dataDirectoryProvider()), this.reports));
  elections = (): SbvElectionService => this.databaseService('elections', (database) => new SbvElectionService(database, this.deadlines(), this.auditLog()));
  electionDocuments = (): SbvElectionDocumentService => this.databaseService('electionDocuments', (database) => new SbvElectionDocumentService(database, new SbvOfficeWorkflowDocumentAdapter(database, this.dataDirectoryProvider())));
  electionExecution = (): ElectionExecutionService => this.databaseService('electionExecution', (database) => new ElectionExecutionService(database, this.deadlines(), this.auditLog(), undefined, undefined, undefined, this.employerObligations()));
  electionArchive = (): ElectionArchiveService => this.databaseService('electionArchive', (database) => new ElectionArchiveService(database, new SbvOfficeWorkflowDocumentAdapter(database, this.dataDirectoryProvider())));
  electionTransfer = (): ElectionTransferService => this.databaseService('electionTransfer', (database) => new ElectionTransferService(database));
}
