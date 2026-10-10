import type { UnifiedSearchQuery } from '../../src/domain/models/unified-search.model.js';
import { SEARCH_SOURCE_CATALOG } from '../../services/search/searchSourceCatalog.js';
import { assertAllowedEnum, assertPlainObject, assertString, IpcValidationError } from './ipcValidation.js';

const CHANNEL = 'cases:search-unified';
const AREAS = ['current_case', 'all_cases', 'all_data'] as const;
const SOURCE_TYPES = new Set(SEARCH_SOURCE_CATALOG.map((source) => source.sourceType));

export function validateUnifiedSearchInput(value: unknown): UnifiedSearchQuery {
  const input = assertPlainObject(value, CHANNEL);
  const query = assertString(input.query, CHANNEL, 'Suchbegriff', { maxLength: 200 }).trim();
  const area = assertAllowedEnum(input.area, CHANNEL, 'Suchbereich', AREAS);
  const currentCaseId = area === 'current_case'
    ? assertString(input.currentCaseId, CHANNEL, 'Fall-ID', { minLength: 1, maxLength: 120 })
    : undefined;
  const limit = input.limit === undefined ? 50 : input.limit;
  const offset = input.offset === undefined ? 0 : input.offset;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new IpcValidationError(CHANNEL, 'Trefferzahl muss zwischen 1 und 100 liegen.');
  }
  if (typeof offset !== 'number' || !Number.isSafeInteger(offset) || offset < 0) {
    throw new IpcValidationError(CHANNEL, 'Trefferposition ist ungültig.');
  }
  let sourceTypes: string[] | undefined;
  if (input.sourceTypes !== undefined) {
    if (!Array.isArray(input.sourceTypes) || input.sourceTypes.length > 60
      || input.sourceTypes.some((source) => typeof source !== 'string' || !SOURCE_TYPES.has(source))) {
      throw new IpcValidationError(CHANNEL, 'Inhaltsfilter ist ungültig.');
    }
    sourceTypes = [...new Set(input.sourceTypes)];
  }
  return { query, area, currentCaseId, sourceTypes, limit, offset };
}
