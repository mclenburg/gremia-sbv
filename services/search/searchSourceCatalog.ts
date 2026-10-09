/**
 * Search coverage contract. A row describes one user-visible result, not every
 * table that happens to contain text. Child tables are indexed with their owner.
 * No entry in this catalog implies that its planned provider already exists.
 */
export type SearchSourceScope = 'case' | 'standalone' | 'linked';
export type SearchSourceState = 'indexed' | 'planned' | 'legacy';
export type SearchArea = 'current_case' | 'all_cases' | 'all_data';
export type SearchLifecycleEvent = 'source_change' | 'source_delete' | 'case_link_change' | 'case_delete' | 'case_anonymize' | 'retention';

export const SEARCH_AREAS = [
  { id: 'current_case', label: 'Diese Fallakte' },
  { id: 'all_cases', label: 'Alle Fallakten' },
  { id: 'all_data', label: 'Gesamter Datenbestand' },
] as const satisfies readonly { id: SearchArea; label: string }[];

export interface SearchSourceDefinition {
  readonly sourceType: string;
  readonly module: string;
  readonly table: string;
  readonly childTables: readonly string[];
  readonly scope: SearchSourceScope;
  readonly caseLink: string | null;
  readonly navigation: string;
  /** Service or lifecycle path that must invalidate/remove all indexed copies. */
  readonly lifecycleOwner: string;
  /** Events the future index provider must handle before it can be enabled. */
  readonly invalidatedBy: readonly SearchLifecycleEvent[];
  readonly encryptedFile: boolean;
  readonly state: SearchSourceState;
}

const source = (
  sourceType: string,
  module: string,
  table: string,
  scope: SearchSourceScope,
  caseLink: string | null,
  navigation: string,
  lifecycleOwner: string,
  state: SearchSourceState,
  childTables: readonly string[] = [],
): SearchSourceDefinition => ({
  sourceType, module, table, childTables, scope, caseLink, navigation, lifecycleOwner, state,
  invalidatedBy: scope === 'case'
    ? ['source_change', 'source_delete', 'case_delete', 'case_anonymize', 'retention']
    : scope === 'linked'
      ? ['source_change', 'source_delete', 'case_link_change', 'case_anonymize', 'retention']
      : ['source_change', 'source_delete', 'retention'],
  encryptedFile: table === 'case_documents' || table === 'generated_documents',
});

/** A linked record without a current case association remains visible globally. */
export function sourceVisibleInArea(
  area: SearchArea,
  sourceScope: SearchSourceScope,
  linkedCaseIds: readonly string[],
  currentCaseId?: string,
): boolean {
  if (area === 'all_data') return true;
  if (sourceScope === 'standalone') return false;
  if (area === 'all_cases') return linkedCaseIds.length > 0;
  return Boolean(currentCaseId && linkedCaseIds.includes(currentCaseId));
}

export const SEARCH_SOURCE_CATALOG: readonly SearchSourceDefinition[] = [
  // Existing case search providers. `document_ocr` is a legacy second result
  // for one document; step 2/3 should fold it into the document result.
  source('case', 'Fallakten', 'cases', 'case', 'cases.id', 'case', 'caseService/caseAnonymizationService/retentionService', 'indexed'),
  source('note', 'Fallakten', 'case_notes', 'case', 'case_note_cases.case_id', 'note', 'caseNoteService/caseAnonymizationService/retentionService', 'indexed', ['case_note_cases', 'case_note_links']),
  source('document', 'Fallakten', 'case_documents', 'case', 'case_documents.case_id', 'document', 'caseDocumentService/caseAnonymizationService/retentionService', 'indexed', ['case_document_ocr_jobs']),
  source('document_ocr', 'Fallakten', 'case_documents', 'case', 'case_documents.case_id', 'document', 'caseDocumentService/caseAnonymizationService/retentionService', 'legacy'),
  source('measure_note', 'Fallakten', 'case_measure_notes', 'case', 'case_measure_notes.case_id', 'measure', 'caseMeasureService/caseAnonymizationService/retentionService', 'indexed'),
  source('bem', 'BEM', 'bem_processes', 'case', 'bem_processes.case_id', 'process', 'bemService/caseProcessDeletion/caseAnonymizationService', 'indexed', ['bem_measures', 'bem_process_contacts']),
  source('bem_event', 'BEM', 'bem_process_events', 'case', 'bem_processes.case_id', 'process', 'bemService/caseProcessDeletion/caseAnonymizationService', 'indexed'),
  source('prevention', 'Prävention', 'prevention_processes', 'case', 'prevention_processes.case_id', 'process', 'preventionService/caseProcessDeletion/caseAnonymizationService', 'indexed', ['prevention_process_contacts']),
  source('prevention_event', 'Prävention', 'prevention_process_events', 'case', 'prevention_processes.case_id', 'process', 'preventionService/caseProcessDeletion/caseAnonymizationService', 'indexed'),
  source('termination', 'Kündigung', 'termination_hearings', 'case', 'termination_hearings.case_id', 'process', 'terminationService/caseProcessDeletion/caseAnonymizationService', 'indexed'),
  source('equalization', 'Gleichstellung', 'equalization_processes', 'case', 'equalization_processes.case_id', 'process', 'equalizationService/caseProcessDeletion/caseAnonymizationService', 'indexed'),
  source('participation', 'Beteiligung', 'sbv_participations', 'case', 'sbv_participations.case_id', 'process', 'participationService/caseProcessDeletion/caseAnonymizationService', 'indexed'),
  source('participation_event', 'Beteiligung', 'sbv_participation_events', 'case', 'sbv_participations.case_id', 'process', 'participationService/caseProcessDeletion/caseAnonymizationService', 'indexed'),
  source('measure', 'Maßnahmen', 'case_measures', 'case', 'case_measures.case_id', 'measure', 'caseMeasureService/caseAnonymizationService/retentionService', 'indexed'),
  source('measure_participation', 'Maßnahmen', 'case_measure_participation', 'case', 'case_measures.case_id', 'measure', 'caseMeasureService/caseAnonymizationService/retentionService', 'planned'),
  source('measure_event', 'Maßnahmen', 'case_measure_events', 'case', 'case_measures.case_id', 'measure', 'caseMeasureService/caseAnonymizationService/retentionService', 'indexed'),
  source('workplace_accommodation', 'Arbeitsplatzgestaltung', 'case_measure_workplace_accommodation', 'case', 'case_measures.case_id', 'measure', 'caseMeasureService/caseAnonymizationService/retentionService', 'indexed'),

  // Standalone and optionally linked professional records. A linked record is
  // indexed once as a source, with zero or more case associations.
  source('person', 'Personen', 'protected_persons', 'linked', 'person_case_links.case_file_id', 'person', 'protectedPersonService/personAnonymizationService/retentionService', 'planned', ['person_case_links']),
  source('legacy_person', 'Personen', 'persons', 'linked', 'cases.person_id', 'legacy_person', 'legacyPersonMigration/retentionService', 'planned'),
  source('contact', 'Kontakte', 'contacts', 'linked', 'case_contacts.case_id', 'contact', 'contactService/contactPrivacyService', 'planned', ['case_contacts']),
  source('journal', 'Tätigkeitsjournal', 'activity_journal_entries', 'linked', 'activity_journal_links.target_id', 'journal', 'activityJournalService/caseAnonymizationService/retentionService', 'planned', ['activity_journal_links']),
  source('external_reference', 'Fallakten', 'case_external_references', 'case', 'case_external_references.case_id', 'external_reference', 'gremiaBrExternalReferenceService/caseAnonymizationService', 'planned'),
  source('privacy_review', 'Datenschutzprüfung', 'privacy_review_items', 'case', 'privacy_review_items.case_id', 'privacy_review', 'privacyReviewService/caseAnonymizationService', 'planned'),
  source('legal_norm', 'Wissensbasis', 'legal_norms', 'standalone', null, 'knowledge', 'knowledgeService', 'planned', ['norm_comments', 'norm_case_law', 'norm_checklist_items']),
  source('case_legal_reference', 'Wissensbasis', 'case_legal_references', 'case', 'case_legal_references.case_id', 'knowledge', 'knowledgeService/caseAnonymizationService', 'planned'),
  source('template', 'Vorlagen', 'document_templates', 'standalone', null, 'template', 'templateService', 'planned'),
  source('legacy_template', 'Vorlagen', 'templates', 'standalone', null, 'legacy_template', 'legacyTemplateMigration', 'planned'),
  source('template_render', 'Vorlagen', 'template_renders', 'linked', 'template_renders.case_id', 'template_render', 'templateService/caseAnonymizationService', 'planned'),
  source('recruiting', 'Stellenbesetzung', 'recruiting_participations', 'standalone', null, 'recruiting', 'recruitingParticipationService/retentionService', 'planned', ['recruiting_interview_events']),
  source('deadline', 'Fristen', 'deadlines', 'linked', 'deadlines.case_id', 'deadline', 'deadlineService/retentionService', 'planned'),
  source('deadline_template', 'Fristen', 'deadline_templates', 'standalone', null, 'deadline_template', 'deadlineService', 'planned'),
  source('control_protocol', 'SBV-Steuerung', 'sbv_control_protocols', 'standalone', null, 'control', 'sbvControlProtocolService/retentionService', 'planned'),
  source('resource', 'SBV-Steuerung', 'sbv_resource_records', 'standalone', null, 'resource', 'sbvResourceService/retentionService', 'planned'),
  source('compliance_incident', 'SBV-Steuerung', 'compliance_incidents', 'standalone', null, 'compliance', 'complianceIncidentService/retentionService', 'planned'),
  source('participation_violation', 'Beteiligungsverstöße', 'sbv_participation_violations', 'linked', 'sbv_participation_violations.case_id', 'violation', 'sbvParticipationViolationService/caseAnonymizationService', 'planned', ['sbv_participation_violation_events']),
  source('generated_document', 'Dokumente', 'generated_documents', 'linked', 'generated_documents.case_id', 'generated_document', 'sbvOfficeDocumentService/caseAnonymizationService/retentionService', 'planned', ['sbv_participation_violation_documents', 'sbv_workflow_document_links']),
  source('gremia_action', 'Gremia.BR', 'gremia_br_workspace_actions', 'linked', 'gremia_br_workspace_actions.case_id', 'gremia_action', 'gremiaBrWorkspaceActionService/caseAnonymizationService', 'planned'),
  source('meeting', 'Gremienarbeit', 'sbv_meetings', 'standalone', null, 'meeting', 'sbvMeetingService/retentionService', 'planned', ['sbv_meeting_agenda_items']),
  source('assembly', 'Gremienarbeit', 'sbv_assemblies', 'standalone', null, 'assembly', 'sbvAssemblyService/retentionService', 'planned'),
  source('employer_obligation', 'SBV-Amtsarbeit', 'sbv_employer_obligation_reviews', 'standalone', null, 'obligation', 'employerObligationService/retentionService', 'planned'),
  source('inclusion_officer', 'SBV-Amtsarbeit', 'sbv_inclusion_officer_snapshots', 'standalone', null, 'inclusion_officer', 'employerObligationService/retentionService', 'planned'),
  source('inclusion_agreement', 'SBV-Amtsarbeit', 'sbv_inclusion_agreements', 'standalone', null, 'inclusion_agreement', 'inclusionAgreementService/retentionService', 'planned', ['sbv_inclusion_agreement_topics']),
  source('complaint', 'SBV-Amtsarbeit', 'sbv_complaint_workflows', 'linked', 'sbv_complaint_workflows.case_id', 'complaint', 'complaintWorkflowService/retentionService', 'planned'),
  source('election', 'SBV-Wahl', 'sbv_elections', 'standalone', null, 'election', 'electionExecutionService/electionArchiveService/retentionService', 'planned', ['sbv_election_board_sessions', 'sbv_election_events']),
  source('election_board_member', 'SBV-Wahl', 'sbv_election_board_members', 'standalone', null, 'election', 'electionExecutionService/electionArchiveService/retentionService', 'planned'),
  source('election_voter', 'SBV-Wahl', 'sbv_election_voters', 'standalone', null, 'election', 'electionExecutionService/electionArchiveService/retentionService', 'planned'),
  source('election_candidate', 'SBV-Wahl', 'sbv_election_candidates', 'standalone', null, 'election', 'electionExecutionService/electionArchiveService/retentionService', 'planned'),
  source('election_proposal', 'SBV-Wahl', 'sbv_election_proposals', 'standalone', null, 'election', 'electionExecutionService/electionArchiveService/retentionService', 'planned', ['sbv_election_proposal_candidates', 'sbv_election_proposal_supporters']),
  source('election_objection', 'SBV-Wahl', 'sbv_election_objections', 'standalone', null, 'election', 'electionExecutionService/electionArchiveService/retentionService', 'planned'),
  source('election_mail_ballot', 'SBV-Wahl', 'sbv_election_mail_ballots', 'standalone', null, 'election', 'electionExecutionService/electionArchiveService/retentionService', 'planned'),
  source('election_result', 'SBV-Wahl', 'sbv_election_results', 'standalone', null, 'election', 'electionExecutionService/electionArchiveService/retentionService', 'planned', ['sbv_election_vote_totals']),
  source('election_physical_record', 'SBV-Wahl', 'sbv_election_physical_records', 'standalone', null, 'election', 'electionExecutionService/electionArchiveService/retentionService', 'planned'),
] as const;

/** Derived indexes, audit/security data, settings and transfer logs are not human search results. */
export const SEARCH_EXCLUDED_TABLES = [
  // Derived full-text copies.
  'case_search_index', 'case_search_index_fts', 'case_search_index_state',
  'search_entries', 'search_entry_cases', 'search_entries_fts', 'search_change_clock', 'search_dirty_tables', 'search_index_build_state',
  'case_notes_fts', 'case_documents_fts',
  // Audit, migration and retention decisions are intentionally not returned as content.
  'personal_data_audit_log', 'audit_log', 'retention_actions', 'deadline_audit',
  'schema_migrations', 'schema_migration_log', 'schema_migration_components',
  // Settings, cryptographic/transfer metadata, caches and implementation references.
  'settings', 'portable_profile', 'gremia_br_settings', 'gremia_br_cache_entries', 'gremia_br_case_creations',
  'mobile_companion_devices', 'mobile_companion_change_imports',
  'case_handover_exports', 'case_handover_export_items', 'case_handover_imports', 'case_handover_import_items',
  'person_import_profiles', 'person_import_runs', 'person_import_run_items', 'contact_text_references',
  'report_exports',
  'activity_journal_category_preferences', 'text_entity_references', 'transfer_recipient_profiles',
  'sbv_election_archive_exports', 'sbv_election_transfer_imports', 'sbv_election_transfer_import_items',
  'sbv_retention_legal_holds',
] as const;
