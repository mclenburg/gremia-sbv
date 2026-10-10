import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { LiveRegionProvider } from '../../../../src/app/shared/a11y/LiveRegionProvider';
import { SearchView } from '../../../../src/app/features/search/SearchView';
import { modules } from '../../../../src/app/core/navigation/modules';
import { resolveSearchCaseNodeTarget } from '../../../../src/app/core/navigation/searchRecordTarget';
import type { UnifiedSearchHit } from '../../../../src/domain/models/unified-search.model';
import { findDescendants, renderElement, visibleText } from '../../../helpers/renderedMarkup';

const baseHit: UnifiedSearchHit = {
  sourceType: 'document', sourceId: 'document-1', module: 'Fallakten', sourceLabel: 'Dokument',
  title: 'Bescheid', excerpt: 'Bescheid', caseId: 'case-1', navigationKind: 'document',
  navigationId: 'document-1', extractionQuality: 'native_text',
};

describe('globale Suche', () => {
  it('ist im Seitenmenü erreichbar und durchsucht zunächst den gesamten Datenbestand', () => {
    expect(modules.find((module) => module.id === 'search')?.shortTitle).toBe('Suche');
    const { markup, tree } = renderElement(createElement(LiveRegionProvider, null,
      createElement(SearchView, { cases: [], onOpenCaseNode: () => undefined, onOpenSearchRecord: () => false })));
    expect(visibleText(markup)).toContain('Gesamter Datenbestand');
    expect(findDescendants(tree, (node) => node.tag === 'input' && node.attrs.value === 'all_data')[0]?.attrs.checked).toBe('');
    expect(visibleText(markup)).toContain('Diese Fallakte');
    expect(visibleText(markup)).toContain('Alle Fallakten');
  });

  it('öffnet Dokument- und Prozesstreffer an ihrer Fallakte', () => {
    expect(resolveSearchCaseNodeTarget(baseHit)).toEqual({ caseId: 'case-1', nodeType: 'document', nodeId: 'document-1' });
    expect(resolveSearchCaseNodeTarget({ ...baseHit, sourceType: 'bem_event', navigationKind: 'process',
      navigationId: 'bem-1' })).toEqual({ caseId: 'case-1', nodeType: 'bem', nodeId: 'bem-1' });
    expect(resolveSearchCaseNodeTarget({ ...baseHit, caseId: undefined })).toBeNull();
  });
});
