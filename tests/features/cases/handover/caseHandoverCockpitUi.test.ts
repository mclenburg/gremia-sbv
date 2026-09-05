import { describe, expect, it } from 'vitest';
import { CaseHandoverCasePicker } from '../../../../src/app/features/case-handover/CaseHandoverCasePicker';
import { filterHandoverCases, toggleHandoverCase } from '../../../../src/app/features/case-handover/caseHandoverCockpitPolicy';
import type { CaseRecord } from '../../../../src/domain/models/case.model';
import { descendants, renderComponent, visibleText } from '../../../helpers/renderedMarkup';

function caseRecord(index: number): CaseRecord {
  return {
    id: `case-${index}`,
    caseNumber: `SBV-2026-${index}`,
    displayName: index === 6 ? 'Gesuchter Vertretungsfall' : `Fallakte ${index}`,
    category: 'sonstiges',
    status: 'offen',
    priority: 'normal',
    openedAt: '2026-09-05T08:00:00.000Z',
    isPseudonymized: true,
    isLocked: false,
  };
}

describe('Übergabe-Cockpit – filterbare Mehrfachauswahl', () => {
  it('bietet bei mehr als fünf Fallakten eine zugängliche Filterung an', () => {
    const cases = Array.from({ length: 6 }, (_, index) => caseRecord(index + 1));
    const rendered = renderComponent(CaseHandoverCasePicker, { cases, selectedIds: [], onChange: () => undefined, legend: 'Fallakten auswählen' });

    expect(visibleText(rendered.markup)).toContain('Fallakten filtern');
    expect(descendants(rendered.tree).some((node) => node.tag === 'input' && node.attrs.type === 'search')).toBe(true);
    expect(descendants(rendered.tree).filter((node) => node.tag === 'input' && node.attrs.type === 'checkbox')).toHaveLength(6);
  });

  it('filtert fachlich relevante Felder und verändert nur die gewählte Auswahl', () => {
    const cases = Array.from({ length: 6 }, (_, index) => caseRecord(index + 1));

    expect(filterHandoverCases(cases, 'gesuchter')).toEqual([cases[5]]);
    expect(toggleHandoverCase(['case-1', 'case-2'], 'case-2')).toEqual(['case-1']);
    expect(toggleHandoverCase(['case-1'], 'case-3')).toEqual(['case-1', 'case-3']);
  });
});
