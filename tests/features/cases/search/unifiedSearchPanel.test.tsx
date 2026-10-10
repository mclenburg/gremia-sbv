import { describe, expect, it } from 'vitest';
import { CaseDetailPanel } from '../../../../src/app/features/cases/CaseDetailPanel';
import { renderComponent, visibleText } from '../../../helpers/renderedMarkup';

describe('Suchoberfläche', () => {
  it('zeigt im allgemeinen Suchbereich Umfang, Herkunft und die vollständige Trefferzahl', () => {
    const { markup } = renderComponent(CaseDetailPanel, {
      children: null,
      searchQuery: 'Bescheid', searchAreaSelector: { area: 'all_data', onChange: () => undefined },
      searchResults: [{ sourceType: 'contact', sourceId: 'contact-1', module: 'Kontakte', sourceLabel: 'Kontakt',
        title: 'Kontaktperson', excerpt: 'Ein [Bescheid] liegt vor', navigationKind: 'contact', navigationId: 'contact-1',
        extractionQuality: 'structured' },
      { sourceType: 'document_ocr', sourceId: 'document-1', module: 'Fallakten', sourceLabel: 'OCR-Text',
        title: 'Scan', excerpt: '[Bescheid] erkannt', caseId: 'fall-1', caseNumber: 'SBV-1',
        navigationKind: 'document', navigationId: 'document-1', extractionQuality: 'ocr' }],
      searchTotal: 70, searchError: '', searchInfo: '', isSearching: false, selectedSearchSourceTypes: [],
      onSearchSubmit: () => undefined, onSearchQueryChange: () => undefined,
      onSearchSourceTypesChange: () => undefined, onSelectSearchResult: () => undefined,
      onLoadMoreSearchResults: () => undefined,
    });
    const text = visibleText(markup);
    expect(text).toContain('Diese Fallakte');
    expect(text).toContain('Alle Fallakten');
    expect(text).toContain('Gesamter Datenbestand');
    expect(text).toContain('Kontakte · Kontakt · Ohne Fallaktenbezug');
    expect(text).toContain('2 von 70 Treffern angezeigt');
    expect(text).toContain('Fallakten · OCR-Text · Fallakte SBV-1 · OCR-Text');
    expect(text).toContain('Weitere Treffer laden');
    expect(markup).toContain('<mark>Bescheid</mark>');
  });

  it('zeigt in der Fallakte keine Bereichsauswahl', () => {
    const { markup } = renderComponent(CaseDetailPanel, {
      children: null, searchQuery: '', searchResults: [], searchTotal: 0,
      searchError: '', searchInfo: '', isSearching: false, selectedSearchSourceTypes: [],
      onSearchSubmit: () => undefined, onSearchQueryChange: () => undefined,
      onSearchSourceTypesChange: () => undefined, onSelectSearchResult: () => undefined,
      onLoadMoreSearchResults: () => undefined,
    });
    expect(visibleText(markup)).not.toContain('Suchbereich');
    expect(markup).not.toContain('name="case-search-area"');
    expect(markup).toContain('aria-label="Diese Fallakte durchsuchen"');
  });
});
