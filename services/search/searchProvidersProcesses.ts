import { documentFromRow, makeSqlProvider, text } from './searchProviderSupport.js';
export const bemSearchProvider = makeSqlProvider({
  sourceType: 'bem',
  label: 'BEM',
  requiredTables: ['bem_processes', 'cases'],
  allSql: `SELECT p.id, p.id AS source_id, p.case_id, c.case_number, p.title, p.trigger_type, p.trigger_description, p.consent_scope, p.data_retention_note, p.participants, p.measures, p.measure_owners, p.result, p.completion_reason, p.confidential_notes, p.first_meeting_at AS occurred_at, p.updated_at FROM bem_processes p JOIN cases c ON c.id = p.case_id`,
  caseSql: `SELECT p.id, p.id AS source_id, p.case_id, c.case_number, p.title, p.trigger_type, p.trigger_description, p.consent_scope, p.data_retention_note, p.participants, p.measures, p.measure_owners, p.result, p.completion_reason, p.confidential_notes, p.first_meeting_at AS occurred_at, p.updated_at FROM bem_processes p JOIN cases c ON c.id = p.case_id WHERE p.case_id = ?`,
  map: (row) => documentFromRow(row, 'bem', 'BEM', row.title ?? 'BEM-Verfahren', text(row.trigger_type, row.trigger_description, row.consent_scope, row.data_retention_note, row.participants, row.measures, row.measure_owners, row.result, row.completion_reason, row.confidential_notes), 'process', row.id),
});

export const bemEventSearchProvider = makeSqlProvider({
  sourceType: 'bem_event',
  label: 'BEM-Ereignis',
  requiredTables: ['bem_process_events', 'bem_processes', 'cases'],
  allSql: `SELECT e.id, e.id AS source_id, p.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, p.id AS process_id FROM bem_process_events e JOIN bem_processes p ON p.id = e.process_id JOIN cases c ON c.id = p.case_id`,
  caseSql: `SELECT e.id, e.id AS source_id, p.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, p.id AS process_id FROM bem_process_events e JOIN bem_processes p ON p.id = e.process_id JOIN cases c ON c.id = p.case_id WHERE p.case_id = ?`,
  map: (row) => documentFromRow(row, 'bem_event', 'BEM-Ereignis', row.title ?? 'BEM-Ereignis', text(row.event_type, row.description), 'process', row.process_id, { navigationSubId: row.id }),
});

export const preventionSearchProvider = makeSqlProvider({
  sourceType: 'prevention',
  label: 'Prävention',
  requiredTables: ['prevention_processes', 'cases'],
  allSql: `SELECT p.id, p.id AS source_id, p.case_id, c.case_number, p.difficulty_type, p.risk_type, p.person_status, p.hazard_description, p.employer_request_summary, p.measures, p.result, p.first_knowledge_at AS occurred_at, p.updated_at FROM prevention_processes p JOIN cases c ON c.id = p.case_id`,
  caseSql: `SELECT p.id, p.id AS source_id, p.case_id, c.case_number, p.difficulty_type, p.risk_type, p.person_status, p.hazard_description, p.employer_request_summary, p.measures, p.result, p.first_knowledge_at AS occurred_at, p.updated_at FROM prevention_processes p JOIN cases c ON c.id = p.case_id WHERE p.case_id = ?`,
  map: (row) => documentFromRow(row, 'prevention', 'Prävention', 'Präventionsverfahren', text(row.difficulty_type, row.risk_type, row.person_status, row.hazard_description, row.employer_request_summary, row.measures, row.result), 'process', row.id),
});

export const preventionEventSearchProvider = makeSqlProvider({
  sourceType: 'prevention_event',
  label: 'Präventionsereignis',
  requiredTables: ['prevention_process_events', 'prevention_processes', 'cases'],
  allSql: `SELECT e.id, e.id AS source_id, p.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, p.id AS process_id FROM prevention_process_events e JOIN prevention_processes p ON p.id = e.process_id JOIN cases c ON c.id = p.case_id`,
  caseSql: `SELECT e.id, e.id AS source_id, p.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, p.id AS process_id FROM prevention_process_events e JOIN prevention_processes p ON p.id = e.process_id JOIN cases c ON c.id = p.case_id WHERE p.case_id = ?`,
  map: (row) => documentFromRow(row, 'prevention_event', 'Präventionsereignis', row.title ?? 'Präventionsereignis', text(row.event_type, row.description), 'process', row.process_id, { navigationSubId: row.id }),
});

export const terminationSearchProvider = makeSqlProvider({
  sourceType: 'termination',
  label: 'Kündigungsanhörung',
  requiredTables: ['termination_hearings', 'cases'],
  allSql: `SELECT t.id, t.id AS source_id, t.case_id, c.case_number, t.status, t.termination_type, t.protection_status, t.employer_reason, t.missing_information, t.sbv_assessment, t.statement, t.received_at AS occurred_at, t.updated_at FROM termination_hearings t JOIN cases c ON c.id = t.case_id`,
  caseSql: `SELECT t.id, t.id AS source_id, t.case_id, c.case_number, t.status, t.termination_type, t.protection_status, t.employer_reason, t.missing_information, t.sbv_assessment, t.statement, t.received_at AS occurred_at, t.updated_at FROM termination_hearings t JOIN cases c ON c.id = t.case_id WHERE t.case_id = ?`,
  map: (row) => documentFromRow(row, 'termination', 'Kündigungsanhörung', 'Kündigungsanhörung', text(row.status, row.termination_type, row.protection_status, row.employer_reason, row.missing_information, row.sbv_assessment, row.statement), 'process', row.id),
});

export const equalizationSearchProvider = makeSqlProvider({
  sourceType: 'equalization',
  label: 'Gleichstellung/GdB',
  requiredTables: ['equalization_processes', 'cases'],
  allSql: `SELECT e.id, e.id AS source_id, e.case_id, c.case_number, e.application_status, e.agency_reference, e.outcome, e.notes, COALESCE(e.application_submitted_at, e.created_at) AS occurred_at, e.updated_at FROM equalization_processes e JOIN cases c ON c.id = e.case_id`,
  caseSql: `SELECT e.id, e.id AS source_id, e.case_id, c.case_number, e.application_status, e.agency_reference, e.outcome, e.notes, COALESCE(e.application_submitted_at, e.created_at) AS occurred_at, e.updated_at FROM equalization_processes e JOIN cases c ON c.id = e.case_id WHERE e.case_id = ?`,
  map: (row) => documentFromRow(row, 'equalization', 'Gleichstellung/GdB', 'Gleichstellung/GdB', text(row.application_status, row.agency_reference, row.outcome, row.notes), 'process', row.id),
});

export const participationSearchProvider = makeSqlProvider({
  sourceType: 'participation',
  label: 'SBV-Beteiligung',
  requiredTables: ['sbv_participations', 'cases'],
  allSql: `SELECT p.id, p.id AS source_id, p.case_id, c.case_number, p.title, p.measure_type, p.status, p.risk_level, p.violation_summary, p.sbv_position, p.next_step, p.first_known_at AS occurred_at, p.updated_at FROM sbv_participations p JOIN cases c ON c.id = p.case_id`,
  caseSql: `SELECT p.id, p.id AS source_id, p.case_id, c.case_number, p.title, p.measure_type, p.status, p.risk_level, p.violation_summary, p.sbv_position, p.next_step, p.first_known_at AS occurred_at, p.updated_at FROM sbv_participations p JOIN cases c ON c.id = p.case_id WHERE p.case_id = ?`,
  map: (row) => documentFromRow(row, 'participation', 'SBV-Beteiligung', row.title ?? 'SBV-Beteiligung', text(row.measure_type, row.status, row.risk_level, row.violation_summary, row.sbv_position, row.next_step), 'process', row.id),
});

export const participationEventSearchProvider = makeSqlProvider({
  sourceType: 'participation_event',
  label: 'SBV-Beteiligungsereignis',
  requiredTables: ['sbv_participation_events', 'sbv_participations', 'cases'],
  allSql: `SELECT e.id, e.id AS source_id, p.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, p.id AS process_id FROM sbv_participation_events e JOIN sbv_participations p ON p.id = e.participation_id JOIN cases c ON c.id = p.case_id`,
  caseSql: `SELECT e.id, e.id AS source_id, p.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, p.id AS process_id FROM sbv_participation_events e JOIN sbv_participations p ON p.id = e.participation_id JOIN cases c ON c.id = p.case_id WHERE p.case_id = ?`,
  map: (row) => documentFromRow(row, 'participation_event', 'SBV-Beteiligungsereignis', row.title ?? 'SBV-Beteiligungsereignis', text(row.event_type, row.description), 'process', row.process_id, { navigationSubId: row.id }),
});

export const measureSearchProvider = makeSqlProvider({
  sourceType: 'measure',
  label: 'Maßnahme',
  requiredTables: ['case_measures', 'case_measure_participation', 'cases'],
  allSql: `
    SELECT m.id, m.id AS source_id, m.case_id, c.case_number, m.type, m.title, m.status, m.risk_level, m.summary, m.next_step, m.opened_at AS occurred_at, m.updated_at,
           p.employer_measure_type, p.person_status, p.decision_stage, p.participation_status, p.information_complete, p.hearing_before_decision, p.decision_notified, p.violation_summary, p.sbv_position
    FROM case_measures m
    JOIN cases c ON c.id = m.case_id
    LEFT JOIN case_measure_participation p ON p.measure_id = m.id
  `,
  caseSql: `
    SELECT m.id, m.id AS source_id, m.case_id, c.case_number, m.type, m.title, m.status, m.risk_level, m.summary, m.next_step, m.opened_at AS occurred_at, m.updated_at,
           p.employer_measure_type, p.person_status, p.decision_stage, p.participation_status, p.information_complete, p.hearing_before_decision, p.decision_notified, p.violation_summary, p.sbv_position
    FROM case_measures m
    JOIN cases c ON c.id = m.case_id
    LEFT JOIN case_measure_participation p ON p.measure_id = m.id
    WHERE m.case_id = ?
  `,
  map: (row) => documentFromRow(
    row,
    'measure',
    'Maßnahme',
    row.title ?? 'Maßnahme',
    text(
      row.type,
      row.status,
      row.risk_level,
      row.summary,
      row.next_step,
      row.employer_measure_type,
      row.person_status,
      row.decision_stage,
      row.participation_status,
      row.information_complete ? 'Information vollständig' : undefined,
      row.hearing_before_decision ? 'Anhörung vor Entscheidung' : undefined,
      row.decision_notified ? 'Entscheidung mitgeteilt' : undefined,
      row.violation_summary,
      row.sbv_position,
    ),
    'measure',
    row.id,
  ),
});

export const measureEventSearchProvider = makeSqlProvider({
  sourceType: 'measure_event',
  label: 'Maßnahmenereignis',
  requiredTables: ['case_measure_events', 'case_measures', 'cases'],
  allSql: `SELECT e.id, e.id AS source_id, m.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, m.id AS measure_id FROM case_measure_events e JOIN case_measures m ON m.id = e.measure_id JOIN cases c ON c.id = m.case_id`,
  caseSql: `SELECT e.id, e.id AS source_id, m.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, m.id AS measure_id FROM case_measure_events e JOIN case_measures m ON m.id = e.measure_id JOIN cases c ON c.id = m.case_id WHERE m.case_id = ?`,
  map: (row) => documentFromRow(row, 'measure_event', 'Maßnahmenereignis', row.title ?? 'Maßnahmenereignis', text(row.event_type, row.description), 'measure', row.measure_id, { navigationSubId: row.id }),
});

export const workplaceAccommodationSearchProvider = makeSqlProvider({
  sourceType: 'workplace_accommodation',
  label: 'Arbeitsplatzgestaltung',
  requiredTables: ['case_measure_workplace_accommodation', 'case_measures', 'cases'],
  allSql: `SELECT w.measure_id AS id, w.measure_id AS source_id, m.case_id, c.case_number, m.title, w.category, w.accommodation_status, w.requested_adjustment, w.legal_basis, w.barrier_or_limitation, w.workplace_context, w.proposed_solution, w.employer_response_status, w.implementation_status, w.outcome, w.created_at AS occurred_at, w.updated_at FROM case_measure_workplace_accommodation w JOIN case_measures m ON m.id = w.measure_id JOIN cases c ON c.id = m.case_id`,
  caseSql: `SELECT w.measure_id AS id, w.measure_id AS source_id, m.case_id, c.case_number, m.title, w.category, w.accommodation_status, w.requested_adjustment, w.legal_basis, w.barrier_or_limitation, w.workplace_context, w.proposed_solution, w.employer_response_status, w.implementation_status, w.outcome, w.created_at AS occurred_at, w.updated_at FROM case_measure_workplace_accommodation w JOIN case_measures m ON m.id = w.measure_id JOIN cases c ON c.id = m.case_id WHERE m.case_id = ?`,
  map: (row) => documentFromRow(row, 'workplace_accommodation', 'Arbeitsplatzgestaltung', row.title ?? 'Arbeitsplatzgestaltung', text(row.category, row.accommodation_status, row.requested_adjustment, row.legal_basis, row.barrier_or_limitation, row.workplace_context, row.proposed_solution, row.employer_response_status, row.implementation_status, row.outcome), 'measure', row.id),
});

