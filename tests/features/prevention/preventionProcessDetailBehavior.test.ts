import { describe, expect, it, vi } from 'vitest';
import { PreventionProcessDetail } from '../../../src/app/features/prevention/PreventionProcessDetail';
import type { PreventionProcessRecord, PreventionStatus } from '../../../src/domain/models/prevention.model';
import { descendants, renderComponent, visibleText } from '../../helpers/renderedMarkup';

const process: PreventionProcessRecord = {
  id: 'synthetic-prevention', caseId: 'synthetic-case', status: 'zu_pruefen',
  difficultyType: 'organisatorisch', riskType: 'ueberlastung', personStatus: 'gleichgestellt',
  contactIds: [], createdAt: '2030-01-01T12:00:00Z', updatedAt: '2030-01-01T12:00:00Z',
};

const visibility: Array<[PreventionStatus, string[]]> = [
  ['zu_pruefen', []],
  ['angefordert', ['Arbeitgeber angefordert am', 'Frist Arbeitgeberreaktion']],
  ['arbeitgeber_reagiert', ['Arbeitgeber angefordert am', 'Frist Arbeitgeberreaktion', 'Arbeitgeberreaktion / Stand']],
  ['inklusionsamt_eingeschaltet', ['Arbeitgeber angefordert am', 'Frist Arbeitgeberreaktion', 'Arbeitgeberreaktion / Stand']],
  ['massnahmen_in_klaerung', ['Arbeitgeber angefordert am', 'Frist Arbeitgeberreaktion', 'Arbeitgeberreaktion / Stand', 'Maßnahmen']],
  ['massnahmen_vereinbart', ['Arbeitgeber angefordert am', 'Frist Arbeitgeberreaktion', 'Arbeitgeberreaktion / Stand', 'Maßnahmen']],
  ['blockiert_verweigert', ['Arbeitgeber angefordert am', 'Frist Arbeitgeberreaktion', 'Arbeitgeberreaktion / Stand', 'Maßnahmen', 'Ergebnis / Abschluss']],
  ['abgeschlossen', ['Arbeitgeber angefordert am', 'Frist Arbeitgeberreaktion', 'Arbeitgeberreaktion / Stand', 'Maßnahmen', 'Ergebnis / Abschluss']],
];

describe('Prevention detail workflow', () => {
  it.each(visibility)('exposes the reached fields with connected labels in status %s', (status, expected) => {
    const onUpdate = vi.fn();
    const onOpenTemplates = vi.fn();
    const { tree, markup } = renderComponent(PreventionProcessDetail, { process: { ...process, status }, onUpdate, onOpenTemplates });
    const nodes = descendants(tree);
    const labels = nodes.filter((node) => node.tag === 'label');
    const controls = nodes.filter((node) => ['input', 'textarea', 'select'].includes(node.tag));
    const textInputs = controls.filter((node) => node.tag !== 'select' && node.attrs.role !== 'combobox');
    const actualLabels = textInputs.map((input) => labels.find((label) => label.attrs.for === input.attrs.id)?.children);
    expect(textInputs).toHaveLength(1 + expected.length);
    expect(actualLabels.every(Boolean)).toBe(true);
    for (const label of ['Gefährdung / Anlass', ...expected]) {
      expect(visibleText(markup)).toContain(label);
    }
    for (const section of nodes.filter((node) => node.tag === 'section')) {
      expect(nodes.some((node) => node.tag === 'h3' && node.attrs.id === section.attrs['aria-labelledby'])).toBe(true);
    }
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onOpenTemplates).not.toHaveBeenCalled();
  });

  it('keeps the missing-process state free of editing actions', () => {
    const { tree, markup } = renderComponent(PreventionProcessDetail, { onUpdate: vi.fn(), onOpenTemplates: vi.fn() });
    expect(visibleText(markup)).toContain('Präventionsverfahren nicht gefunden.');
    expect(descendants(tree).filter((node) => ['input', 'textarea', 'button', 'select'].includes(node.tag))).toHaveLength(0);
  });

  it('renders existing follow-up data without issuing updates', () => {
    const onUpdate = vi.fn();
    const { markup, tree } = renderComponent(PreventionProcessDetail, {
      process: { ...process, status: 'abgeschlossen', hazardDescription: 'Synthetischer Anlass', employerRequestSummary: 'Arbeitgeber beteiligt', measures: 'Arbeitsplatz angepasst', result: 'Wirkung bestätigt' },
      onUpdate, onOpenTemplates: vi.fn(),
    });
    const text = visibleText(markup);
    for (const value of ['Synthetischer Anlass', 'Arbeitgeber beteiligt', 'Arbeitsplatz angepasst', 'Wirkung bestätigt']) expect(text).toContain(value);
    const dates = descendants(tree).filter((node) => node.tag === 'input' && node.attrs.type === 'datetime-local');
    expect(dates).toHaveLength(2);
    expect(dates.every((node) => node.attrs.value === '')).toBe(true);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
