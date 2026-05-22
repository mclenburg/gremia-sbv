import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CASE_DOCUMENTS_REQUIRED_COLUMNS, CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS, CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS, CASE_MEASURE_NOTES_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS, GREMIA_BR_CACHE_REQUIRED_COLUMNS, GREMIA_BR_SETTINGS_REQUIRED_COLUMNS } from '../services/appSchema';
import { compareIndexSnapshot, compareTableSnapshot, createSqlSchemaSnapshot } from '../services/schemaSnapshotPolicy';

describe('Schema-Snapshot Fresh Install vs. Legacy-Migration 0.9.1', () => {
  it('hält case_measure_notes in Basisschema und Migration 0026 strukturgleich', () => {
    const fresh = createSqlSchemaSnapshot(readFileSync('database/schema.sql', 'utf8'));
    const migrated = createSqlSchemaSnapshot(readFileSync('database/migrations/0026_case_measure_notes.sql', 'utf8'));

    const problems = [
      ...compareTableSnapshot(fresh, migrated, 'case_measure_notes'),
      ...compareIndexSnapshot(fresh, migrated, 'idx_case_measure_notes_measure'),
      ...compareIndexSnapshot(fresh, migrated, 'idx_case_measure_notes_case'),
    ];

    expect(problems).toEqual([]);
    expect(fresh.tables.case_measure_notes.columns).toEqual(expect.arrayContaining([...CASE_MEASURE_NOTES_REQUIRED_COLUMNS]));
  });

  it('hält case_search_index in Basisschema und Migration 0027 strukturgleich', () => {
    const fresh = createSqlSchemaSnapshot(readFileSync('database/schema.sql', 'utf8'));
    const migrated = createSqlSchemaSnapshot(readFileSync('database/migrations/0027_case_search_index.sql', 'utf8'));

    const problems = [
      ...compareTableSnapshot(fresh, migrated, 'case_search_index'),
      ...compareIndexSnapshot(fresh, migrated, 'idx_case_search_index_case'),
      ...compareIndexSnapshot(fresh, migrated, 'idx_case_search_index_source'),
      ...compareIndexSnapshot(fresh, migrated, 'idx_case_search_index_navigation'),
    ];

    expect(problems).toEqual([]);
    expect(fresh.tables.case_search_index.columns).toEqual(expect.arrayContaining([...CASE_SEARCH_INDEX_REQUIRED_COLUMNS]));
  });


  it('hält Dokument-Extraktionsmetadaten in Basisschema und Migration 0028 nachvollziehbar', () => {
    const fresh = createSqlSchemaSnapshot(readFileSync('database/schema.sql', 'utf8'));
    const migrated = createSqlSchemaSnapshot(readFileSync('database/migrations/0028_document_text_extraction_metadata.sql', 'utf8'));

    const expectedColumns = ['extraction_quality', 'text_extraction_status', 'text_extracted_at'];

    expect(fresh.tables.case_documents.columns).toEqual(expect.arrayContaining([...CASE_DOCUMENTS_REQUIRED_COLUMNS]));
    expect(migrated.tables.case_documents.columns).toEqual(expect.arrayContaining(expectedColumns));
  });


  it('hält Dokument-Extraktionsdiagnostik in Basisschema und Migration 0030 nachvollziehbar', () => {
    const fresh = createSqlSchemaSnapshot(readFileSync('database/schema.sql', 'utf8'));
    const migrated = createSqlSchemaSnapshot(readFileSync('database/migrations/0030_document_text_extraction_diagnostics.sql', 'utf8'));

    const expectedColumns = ['text_extractor_id', 'text_extraction_error'];

    expect(fresh.tables.case_documents.columns).toEqual(expect.arrayContaining([...CASE_DOCUMENTS_REQUIRED_COLUMNS]));
    expect(migrated.tables.case_documents.columns).toEqual(expect.arrayContaining(expectedColumns));
  });


  it('hält OCR-Hintergrundjob-Struktur in Basisschema und Migration 0031 nachvollziehbar', () => {
    const fresh = createSqlSchemaSnapshot(readFileSync('database/schema.sql', 'utf8'));
    const migrated = createSqlSchemaSnapshot(readFileSync('database/migrations/0031_document_ocr_background_jobs.sql', 'utf8'));

    const expectedDocumentColumns = ['ocr_status', 'ocr_text', 'ocr_engine', 'ocr_started_at', 'ocr_completed_at', 'ocr_error'];

    expect(fresh.tables.case_documents.columns).toEqual(expect.arrayContaining([...CASE_DOCUMENTS_REQUIRED_COLUMNS]));
    expect(migrated.tables.case_documents.columns).toEqual(expect.arrayContaining(expectedDocumentColumns));
    expect(fresh.tables.case_document_ocr_jobs.columns).toEqual(expect.arrayContaining([...CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS]));
    expect(migrated.tables.case_document_ocr_jobs.columns).toEqual(expect.arrayContaining([...CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS]));
  });


  it('hält case_search_index_state in Basisschema und Migration 0029 strukturgleich', () => {
    const fresh = createSqlSchemaSnapshot(readFileSync('database/schema.sql', 'utf8'));
    const migrated = createSqlSchemaSnapshot(readFileSync('database/migrations/0029_case_search_index_state.sql', 'utf8'));

    const problems = compareTableSnapshot(fresh, migrated, 'case_search_index_state');

    expect(problems).toEqual([]);
    expect(fresh.tables.case_search_index_state.columns).toEqual(expect.arrayContaining([...CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS]));
  });


  it('hält Gremia.BR-Einstellungen in Basisschema und Migration 0032 plus 0034 strukturgleich', () => {
    const fresh = createSqlSchemaSnapshot(readFileSync('database/schema.sql', 'utf8'));
    const migrated = createSqlSchemaSnapshot(`${readFileSync('database/migrations/0032_gremia_br_settings.sql', 'utf8')}\n${readFileSync('database/migrations/0034_gremia_br_relevance_settings.sql', 'utf8')}`);

    const problems = compareTableSnapshot(fresh, migrated, 'gremia_br_settings');

    expect(problems).toEqual([]);
    expect(fresh.tables.gremia_br_settings.columns).toEqual(expect.arrayContaining([...GREMIA_BR_SETTINGS_REQUIRED_COLUMNS]));
  });


  it('hält Gremia.BR-Lesecache in Basisschema und Migration 0033 strukturgleich', () => {
    const fresh = createSqlSchemaSnapshot(readFileSync('database/schema.sql', 'utf8'));
    const migrated = createSqlSchemaSnapshot(readFileSync('database/migrations/0033_gremia_br_read_cache.sql', 'utf8'));

    const problems = [
      ...compareTableSnapshot(fresh, migrated, 'gremia_br_cache_entries'),
      ...compareIndexSnapshot(fresh, migrated, 'idx_gremia_br_cache_entries_key'),
      ...compareIndexSnapshot(fresh, migrated, 'idx_gremia_br_cache_entries_fetched'),
    ];

    expect(problems).toEqual([]);
    expect(fresh.tables.gremia_br_cache_entries.columns).toEqual(expect.arrayContaining([...GREMIA_BR_CACHE_REQUIRED_COLUMNS]));
  });


  it('hält externe Gremia.BR-Fallaktenreferenzen in Basisschema und Migration 0035 strukturgleich', () => {
    const fresh = createSqlSchemaSnapshot(readFileSync('database/schema.sql', 'utf8'));
    const migrated = createSqlSchemaSnapshot(readFileSync('database/migrations/0035_gremia_br_external_references.sql', 'utf8'));

    const problems = [
      ...compareTableSnapshot(fresh, migrated, 'case_external_references'),
      ...compareIndexSnapshot(fresh, migrated, 'idx_case_external_references_case'),
      ...compareIndexSnapshot(fresh, migrated, 'idx_case_external_references_source'),
    ];

    expect(problems).toEqual([]);
    expect(fresh.tables.case_external_references.columns).toEqual(expect.arrayContaining([...CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS]));
  });

});
