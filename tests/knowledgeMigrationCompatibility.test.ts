import { describe, expect, it } from 'vitest';
import { classifyCaseLegalReferencesColumns } from '../services/knowledgeMigrationPolicy';

describe('knowledge migration compatibility policy', () => {
  it('recognizes the current knowledge-base relation table', () => {
    expect(classifyCaseLegalReferencesColumns(['id', 'case_id', 'legal_norm_id', 'note', 'created_at'])).toBe('current');
  });

  it('recognizes the pre-knowledge-base legal reference table as legacy', () => {
    expect(classifyCaseLegalReferencesColumns(['case_id', 'legal_reference_id'])).toBe('legacy');
  });

  it('treats a missing table as missing', () => {
    expect(classifyCaseLegalReferencesColumns([])).toBe('missing');
  });
});
