import { bool, documentFromRow, makeSqlProvider, text } from './searchProviderSupport.js';
import type { CaseSearchExtractionQuality } from './searchTypes.js';
import type { ConfidentialLevel } from '../../src/app/core/models/case-note.model.js';
export const caseMetadataSearchProvider = makeSqlProvider({
  sourceType: 'case',
  label: 'Fallakte',
  requiredTables: ['cases'],
  allSql: `SELECT id, id AS source_id, id AS case_id, case_number, display_name, category, status, summary, opened_at AS occurred_at, COALESCE(closed_at, opened_at) AS updated_at FROM cases`,
  caseSql: `SELECT id, id AS source_id, id AS case_id, case_number, display_name, category, status, summary, opened_at AS occurred_at, COALESCE(closed_at, opened_at) AS updated_at FROM cases WHERE id = ?`,
  map: (row) => documentFromRow(
    row,
    'case',
    'Fallakte',
    row.display_name ?? row.case_number ?? 'Fallakte',
    text(row.case_number, row.display_name, row.category, row.status, row.summary),
    'case',
    row.id,
    { containsHealthData: true, confidentiality: 'sensibel', extractionQuality: 'structured' },
  ),
});

export const caseNotesSearchProvider = makeSqlProvider({
  sourceType: 'note',
  label: 'Fallnotiz',
  requiredTables: ['case_notes', 'case_note_cases', 'cases'],
  allSql: `
    SELECT n.id, n.id AS source_id, link.case_id, c.case_number, n.title, n.participants, n.content, n.next_steps, n.note_date AS occurred_at, n.updated_at, n.contains_health_data, n.confidential_level
    FROM case_notes n
    JOIN case_note_cases link ON link.note_id = n.id
    JOIN cases c ON c.id = link.case_id
  `,
  caseSql: `
    SELECT n.id, n.id AS source_id, link.case_id, c.case_number, n.title, n.participants, n.content, n.next_steps, n.note_date AS occurred_at, n.updated_at, n.contains_health_data, n.confidential_level
    FROM case_notes n
    JOIN case_note_cases link ON link.note_id = n.id
    JOIN cases c ON c.id = link.case_id
    WHERE link.case_id = ?
  `,
  map: (row) => documentFromRow(
    row,
    'note',
    'Fallnotiz',
    row.title ?? 'Gesprächsnotiz',
    text(row.participants, row.content, row.next_steps),
    'note',
    row.id,
    {
      occurredAt: row.occurred_at ?? undefined,
      containsHealthData: bool(row.contains_health_data),
      confidentiality: (row.confidential_level ?? 'sensibel') as ConfidentialLevel,
      extractionQuality: 'manual',
    },
  ),
});

export const caseDocumentsSearchProvider = makeSqlProvider({
  sourceType: 'document',
  label: 'Dokument',
  requiredTables: ['case_documents', 'cases'],
  allSql: `
    SELECT d.id, d.id AS source_id, d.case_id, c.case_number, d.display_title, d.filename, d.extracted_text, d.mime_type, d.created_at AS occurred_at, d.imported_at AS updated_at, d.contains_health_data, d.extraction_quality, d.text_extraction_status, d.text_extractor_id, d.ocr_status, d.ocr_engine
    FROM case_documents d
    JOIN cases c ON c.id = d.case_id
  `,
  caseSql: `
    SELECT d.id, d.id AS source_id, d.case_id, c.case_number, d.display_title, d.filename, d.extracted_text, d.mime_type, d.created_at AS occurred_at, d.imported_at AS updated_at, d.contains_health_data, d.extraction_quality, d.text_extraction_status, d.text_extractor_id, d.ocr_status, d.ocr_engine
    FROM case_documents d
    JOIN cases c ON c.id = d.case_id
    WHERE d.case_id = ?
  `,
  map: (row) => documentFromRow(
    row,
    'document',
    'Dokument',
    row.display_title ?? row.filename ?? 'Dokument',
    text(row.filename, row.extracted_text),
    'document',
    row.id,
    {
      keywords: text(row.mime_type, row.text_extraction_status, row.extraction_quality, row.text_extractor_id, row.ocr_status, row.ocr_engine),
      occurredAt: row.occurred_at ?? undefined,
      containsHealthData: bool(row.contains_health_data),
      confidentiality: 'sensibel',
      extractionQuality: (row.extraction_quality ?? (row.extracted_text ? 'native_text' : 'unknown')) as CaseSearchExtractionQuality,
    },
  ),
});


export const documentOcrSearchProvider = makeSqlProvider({
  sourceType: 'document_ocr',
  label: 'OCR-Text',
  requiredTables: ['case_documents', 'cases'],
  allSql: `
    SELECT d.id, d.id AS source_id, d.case_id, c.case_number, d.display_title, d.filename, d.ocr_text, d.mime_type, d.created_at AS occurred_at, COALESCE(d.ocr_completed_at, d.imported_at) AS updated_at, d.contains_health_data, d.ocr_status, d.ocr_engine
    FROM case_documents d
    JOIN cases c ON c.id = d.case_id
    WHERE d.ocr_status = 'completed' AND COALESCE(d.ocr_text, '') <> ''
  `,
  caseSql: `
    SELECT d.id, d.id AS source_id, d.case_id, c.case_number, d.display_title, d.filename, d.ocr_text, d.mime_type, d.created_at AS occurred_at, COALESCE(d.ocr_completed_at, d.imported_at) AS updated_at, d.contains_health_data, d.ocr_status, d.ocr_engine
    FROM case_documents d
    JOIN cases c ON c.id = d.case_id
    WHERE d.case_id = ? AND d.ocr_status = 'completed' AND COALESCE(d.ocr_text, '') <> ''
  `,
  map: (row) => documentFromRow(
    row,
    'document_ocr',
    'OCR-Text',
    row.display_title ?? row.filename ?? 'OCR-Text',
    text(row.filename, row.ocr_text),
    'document',
    row.id,
    {
      keywords: text(row.mime_type, row.ocr_status, row.ocr_engine),
      occurredAt: row.occurred_at ?? undefined,
      containsHealthData: bool(row.contains_health_data),
      confidentiality: 'sensibel',
      extractionQuality: 'ocr',
    },
  ),
});

export const caseMeasureNotesSearchProvider = makeSqlProvider({
  sourceType: 'measure_note',
  label: 'Maßnahmennotiz',
  requiredTables: ['case_measure_notes', 'cases'],
  allSql: `
    SELECT n.id, n.id AS source_id, n.case_id, c.case_number, n.measure_type, n.measure_id, n.title, n.participants, n.content, n.next_steps, n.note_at AS occurred_at, n.updated_at, n.contains_health_data, n.confidential_level
    FROM case_measure_notes n
    JOIN cases c ON c.id = n.case_id
  `,
  caseSql: `
    SELECT n.id, n.id AS source_id, n.case_id, c.case_number, n.measure_type, n.measure_id, n.title, n.participants, n.content, n.next_steps, n.note_at AS occurred_at, n.updated_at, n.contains_health_data, n.confidential_level
    FROM case_measure_notes n
    JOIN cases c ON c.id = n.case_id
    WHERE n.case_id = ?
  `,
  map: (row) => documentFromRow(
    row,
    'measure_note',
    'Maßnahmennotiz',
    row.title ?? 'Maßnahmennotiz',
    text(row.measure_type, row.participants, row.content, row.next_steps),
    'measure',
    row.measure_id ?? undefined,
    {
      navigationSubId: row.id ?? undefined,
      occurredAt: row.occurred_at ?? undefined,
      containsHealthData: bool(row.contains_health_data),
      confidentiality: (row.confidential_level ?? 'sensibel') as ConfidentialLevel,
      extractionQuality: 'manual',
    },
  ),
});

