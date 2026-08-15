import { describe, expect, it } from 'vitest';
import { CASE_ANONYMIZATION_MATRIX, matrixEntry } from '../../services/caseAnonymizationMatrix';

describe('case anonymization matrix', () => {
  it('classifies the high-risk case-linked data classes explicitly', () => {
    const tables = new Set(CASE_ANONYMIZATION_MATRIX.map((entry) => entry.table));
    for (const table of [
      'cases', 'case_notes', 'case_measure_notes', 'deadlines', 'deadline_audit', 'template_renders',
      'case_legal_references', 'case_note_cases', 'case_note_links', 'activity_journal_entries', 'activity_journal_links',
      'sbv_participation_violations', 'sbv_participation_violation_events', 'generated_documents',
      'case_external_references', 'case_handover_import_items', 'case_search_index', 'case_search_index_fts', 'personal_data_audit_log', 'audit_log',
    ]) expect(tables.has(table)).toBe(true);
  });

  it('keeps both hash-chain stores immutable and classifies identity/external relations for unlinking', () => {
    expect(matrixEntry('personal_data_audit_log')?.immutable).toBe(true);
    expect(matrixEntry('audit_log')?.immutable).toBe(true);
    expect(matrixEntry('case_external_references')?.relationStrategy).toBe('ENTKOPPELN');
    expect(matrixEntry('case_handover_import_items')?.relationStrategy).toBe('ENTKOPPELN');
    expect(matrixEntry('generated_documents')?.relationStrategy).toBe('LÖSCHEN');
  });

  it('classifies deadline history and journal/violation narratives as free text instead of deleting structural facts', () => {
    expect(matrixEntry('deadlines')?.freeTextFields).toEqual(expect.arrayContaining(['title', 'description', 'completed_note', 'cancelled_reason', 'notes']));
    expect(matrixEntry('deadline_audit')?.freeTextFields).toEqual(['old_value', 'new_value', 'reason']);
    expect(matrixEntry('activity_journal_entries')?.freeTextFields).toEqual(['title', 'description', 'result_note']);
    expect(matrixEntry('sbv_participation_violations')?.freeTextFields).toEqual(expect.arrayContaining(['subject', 'measure_description', 'wrong_behavior', 'required_behavior']));
  });
});
