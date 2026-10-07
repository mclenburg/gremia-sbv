import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { DataTable, EmptyState, RecordList, SearchToolbar, recordMatchesQuery } from '../../src/app/shared/components/WorkbenchLayout';
import { descendants, renderComponent, renderElement, visibleText } from '../helpers/renderedMarkup';

describe('shared search, list and table behavior', () => {
  it('provides a labelled search input and announces the result count', () => {
    const { tree, markup } = renderComponent(SearchToolbar, {
      searchLabel: 'Nachweise durchsuchen', searchValue: 'Schulung', resultCount: 2,
      onSearchChange: () => undefined,
    });
    const nodes = descendants(tree);
    const input = nodes.find((node) => node.tag === 'input');
    const label = nodes.find((node) => node.tag === 'label');
    expect(input?.attrs.type).toBe('search');
    expect(input?.attrs.value).toBe('Schulung');
    expect(input?.attrs.id).toBeTruthy();
    expect(label?.attrs.for).toBe(input?.attrs.id);
    expect(nodes.some((node) => node.attrs.role === 'search')).toBe(true);
    expect(nodes.some((node) => node.attrs['aria-live'] === 'polite')).toBe(true);
    expect(visibleText(markup)).toContain('Nachweise durchsuchen');
    expect(visibleText(markup)).toContain('2 Treffer');
  });

  it('filters records using normalized search values', () => {
    expect(recordMatchesQuery(['SBV-Schulung', '§ 179 Abs. 4 SGB IX'], 'schulung')).toBe(true);
    expect(recordMatchesQuery(['Datenschutzvorfall', 'reported', 'high'], 'REPORT')).toBe(true);
    expect(recordMatchesQuery(['Datenschutzvorfall', 'closed', 'low'], 'mittel')).toBe(false);
    expect(recordMatchesQuery(['Nachweis'], '   ')).toBe(true);
    expect(recordMatchesQuery([null, undefined, 2026], '2026')).toBe(true);
  });

  it.each([false, true])('renders list contents or the accessible empty state (populated: %s)', (populated) => {
    const { tree, markup } = renderElement(createElement(RecordList<{ id: string; title: string }>, {
      items: populated ? [{ id: 'record-1', title: 'Schulung' }] : [],
      getKey: (item) => item.id,
      renderItem: (item) => createElement('button', { type: 'button' }, item.title),
      ariaLabel: 'Nachweise',
      empty: createElement(EmptyState, { text: 'Keine Nachweise vorhanden.' }),
    }));
    const nodes = descendants(tree);
    expect(nodes.some((node) => node.attrs['aria-label'] === 'Nachweise')).toBe(true);
    expect(nodes.filter((node) => node.tag === 'button')).toHaveLength(populated ? 1 : 0);
    expect(nodes.filter((node) => node.attrs.role === 'status')).toHaveLength(populated ? 0 : 1);
    expect(visibleText(markup)).toContain(populated ? 'Schulung' : 'Keine Nachweise vorhanden.');
    expect(visibleText(markup)).not.toContain(populated ? 'Keine Nachweise vorhanden.' : 'Schulung');
  });

  it.each([false, true])('renders a labelled semantic table or the empty state (populated: %s)', (populated) => {
    const { tree, markup } = renderComponent(DataTable, {
      headers: ['Pflicht', 'Nachweis'], ariaLabel: 'Arbeitgeberpflichten',
      rows: populated ? [{ id: 'obligation-1', cells: ['Anzeige', 'Eingang dokumentiert'] }] : [],
      empty: createElement(EmptyState, { text: 'Keine Prüfvorgänge vorhanden.' }),
    });
    const nodes = descendants(tree);
    expect(nodes.filter((node) => node.tag === 'table')).toHaveLength(populated ? 1 : 0);
    expect(nodes.filter((node) => node.attrs.role === 'status')).toHaveLength(populated ? 0 : 1);
    if (populated) {
      expect(nodes.find((node) => node.tag === 'table')?.attrs['aria-label']).toBe('Arbeitgeberpflichten');
      expect(nodes.filter((node) => node.tag === 'th').map((node) => node.attrs.scope)).toEqual(['col', 'col']);
      expect(nodes.filter((node) => node.tag === 'td')).toHaveLength(2);
      expect(visibleText(markup)).toContain('Pflicht Nachweis Anzeige Eingang dokumentiert');
    } else {
      expect(visibleText(markup)).toContain('Keine Prüfvorgänge vorhanden.');
    }
  });
});
