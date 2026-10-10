import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CASE_SEARCH_PROVIDERS } from '../../../../services/search/searchProviders.js';
import { SEARCH_AREAS, SEARCH_EXCLUDED_TABLES, SEARCH_SOURCE_CATALOG, sourceVisibleInArea } from '../../../../services/search/searchSourceCatalog.js';
import { FREE_TEXT_SOURCES } from '../../../../services/dsarPrefillSupport.js';

describe('search source catalog', () => {
  it('covers every existing provider and marks the duplicate OCR source as legacy', () => {
    const indexedOrLegacy = SEARCH_SOURCE_CATALOG.filter((entry) => entry.state !== 'planned').map((entry) => entry.sourceType);
    expect(indexedOrLegacy.sort()).toEqual(CASE_SEARCH_PROVIDERS.map((provider) => provider.sourceType).sort());
    expect(SEARCH_SOURCE_CATALOG.find((entry) => entry.sourceType === 'document_ocr')?.state).toBe('legacy');
  });

  it('assigns each source one scope, navigation target and lifecycle owner', () => {
    const types = SEARCH_SOURCE_CATALOG.map((entry) => entry.sourceType);
    expect(new Set(types).size).toBe(types.length);
    for (const entry of SEARCH_SOURCE_CATALOG) {
      expect(entry.table).toBeTruthy();
      expect(entry.navigation).toBeTruthy();
      expect(entry.lifecycleOwner).toBeTruthy();
      expect(entry.invalidatedBy).toContain('source_change');
      expect(entry.invalidatedBy).toContain('source_delete');
      if (entry.scope === 'linked') expect(entry.invalidatedBy).toContain('case_link_change');
      if (entry.scope === 'standalone') expect(entry.caseLink).toBeNull();
      else expect(entry.caseLink).toEqual(expect.any(String));
    }
  });

  it('keeps both document stores and non-case records in the future coverage contract', () => {
    expect(SEARCH_SOURCE_CATALOG.find((entry) => entry.sourceType === 'document')?.table).toBe('case_documents');
    expect(SEARCH_SOURCE_CATALOG.find((entry) => entry.sourceType === 'generated_document')?.table).toBe('generated_documents');
    expect(SEARCH_SOURCE_CATALOG.filter((entry) => entry.encryptedFile).map((entry) => entry.table).sort())
      .toEqual(['case_documents', 'case_documents', 'generated_documents']);
    for (const table of ['protected_persons', 'contacts', 'activity_journal_entries', 'legal_norms', 'sbv_meetings']) {
      expect(SEARCH_SOURCE_CATALOG.some((entry) => entry.table === table)).toBe(true);
    }
    const covered = new Set(SEARCH_SOURCE_CATALOG.flatMap((entry) => [entry.table, ...entry.childTables]));
    for (const table of SEARCH_EXCLUDED_TABLES) expect(covered.has(table)).toBe(false);
  });

  it('defines the three user scopes without leaking standalone or unlinked records into case search', () => {
    expect(SEARCH_AREAS.map((area) => area.label)).toEqual(['Diese Fallakte', 'Alle Fallakten', 'Gesamter Datenbestand']);
    expect(sourceVisibleInArea('current_case', 'case', ['A'], 'A')).toBe(true);
    expect(sourceVisibleInArea('current_case', 'case', ['A'], 'B')).toBe(false);
    expect(sourceVisibleInArea('all_cases', 'linked', ['A'])).toBe(true);
    expect(sourceVisibleInArea('all_cases', 'linked', [])).toBe(false);
    expect(sourceVisibleInArea('all_cases', 'standalone', [])).toBe(false);
    expect(sourceVisibleInArea('all_data', 'standalone', [])).toBe(true);
    expect(sourceVisibleInArea('all_data', 'linked', [])).toBe(true);
  });

  it('accounts for every existing DSAR free-text table, including deliberate exclusions', () => {
    const accountedFor = new Set([
      ...SEARCH_SOURCE_CATALOG.flatMap((entry) => [entry.table, ...entry.childTables]),
      ...SEARCH_EXCLUDED_TABLES,
    ]);
    const missing = [...new Set(FREE_TEXT_SOURCES.map((source) => source.table))].filter((table) => !accountedFor.has(table));
    expect(missing).toEqual([]);
  });

  it('classifies every table in the shipped schema snapshot', () => {
    const schema = readFileSync(new URL('../../../../database/schema.sql', import.meta.url), 'utf8');
    const tables = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS ([a-z_]+)/g)].map((match) => match[1]);
    const accountedFor = new Set([
      ...SEARCH_SOURCE_CATALOG.flatMap((entry) => [entry.table, ...entry.childTables]),
      ...SEARCH_EXCLUDED_TABLES,
    ]);
    expect(tables.filter((table) => !accountedFor.has(table))).toEqual([]);
  });
});
