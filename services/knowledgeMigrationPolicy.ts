export type CaseLegalReferencesSchemaState = 'missing' | 'legacy' | 'current' | 'unknown';

export function classifyCaseLegalReferencesColumns(columns: string[]): CaseLegalReferencesSchemaState {
  if (columns.length === 0) return 'missing';
  const set = new Set(columns);

  if (set.has('case_id') && set.has('legal_norm_id')) return 'current';
  if (set.has('case_id') && set.has('legal_reference_id') && !set.has('legal_norm_id')) return 'legacy';
  if (set.has('case_id') && !set.has('legal_norm_id')) return 'legacy';

  return 'unknown';
}
