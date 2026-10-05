import { describe, expect, it, vi } from 'vitest';
import { WorkplaceAccommodationProcessDetail } from '../../../src/app/features/workplace-accommodation/WorkplaceAccommodationProcessDetail';
import type { WorkplaceAccommodationRecord } from '../../../src/domain/models/workplace-accommodation.model';
import { descendants, renderComponent, visibleText } from '../../helpers/renderedMarkup';

const process: WorkplaceAccommodationRecord = {
  id: 'synthetic-workplace', caseId: 'synthetic-case', title: 'Synthetische Arbeitsplatzgestaltung',
  status: 'entwurf', category: 'technische_arbeitshilfe', riskLevel: 'erhoeht',
  requestedAdjustment: 'Synthetische Arbeitshilfe', legalBasis: '§ 164 Abs. 4 SGB IX',
  technicalAidNeeded: true, organizationalAdjustmentNeeded: false, workingTimeAdjustmentNeeded: true,
  qualificationNeeded: false, fixedWorkplaceNeeded: true, homeofficeOrMobileWorkRelevant: false,
  inclusionOfficeInvolved: true, rehabCarrierInvolved: false,
  employerResponseStatus: 'offen', implementationStatus: 'nicht_begonnen',
  createdAt: '2030-01-01T12:00:00Z', updatedAt: '2030-01-01T12:00:00Z',
};

describe('Workplace accommodation detail', () => {
  it.each([
    { status: 'entwurf', employerResponseStatus: 'offen', inclusionOfficeInvolved: false, warning: undefined },
    { status: 'angefragt', employerResponseStatus: 'offen', inclusionOfficeInvolved: false, warning: 'Arbeitgeberreaktion ist offen.' },
    { status: 'arbeitgeber_lehnt_ab', employerResponseStatus: 'abgelehnt', inclusionOfficeInvolved: false, warning: 'Ablehnung dokumentiert.' },
    { status: 'arbeitgeber_lehnt_ab', employerResponseStatus: 'abgelehnt', inclusionOfficeInvolved: true, warning: undefined },
    { status: 'abgeschlossen', employerResponseStatus: 'offen', inclusionOfficeInvolved: false, warning: undefined },
  ] as const)('shows only the relevant employer warning for %j', ({ warning, ...state }) => {
    const onUpdate = vi.fn();
    const { markup } = renderComponent(WorkplaceAccommodationProcessDetail, { process: { ...process, ...state }, onUpdate });
    const text = visibleText(markup);
    if (warning) expect(text).toContain(warning);
    else {
      expect(text).not.toContain('Arbeitgeberreaktion ist offen.');
      expect(text).not.toContain('Ablehnung dokumentiert.');
    }
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('renders all eight labeled checkpoints with their persisted values', () => {
    const { tree } = renderComponent(WorkplaceAccommodationProcessDetail, { process, onUpdate: vi.fn() });
    const nodes = descendants(tree);
    const checks = nodes.filter((node) => node.tag === 'input' && node.attrs.type === 'checkbox');
    expect(checks).toHaveLength(8);
    expect(checks.map((node) => Object.hasOwn(node.attrs, 'checked'))).toEqual([true, false, true, false, true, false, true, false]);
    expect(checks.every((node) => nodes.some((label) => label.tag === 'label' && label.attrs.for === node.attrs.id))).toBe(true);
  });

  it('renders empty or invalid dates consistently across implementation and funding', () => {
    const { tree } = renderComponent(WorkplaceAccommodationProcessDetail, {
      process: { ...process, employerResponseAt: 'invalid', fundingAppliedAt: 'invalid', orderedAt: 'invalid' }, onUpdate: vi.fn(),
    });
    const dates = descendants(tree).filter((node) => node.tag === 'input' && node.attrs.type === 'datetime-local');
    expect(dates).toHaveLength(5);
    expect(dates.every((node) => node.attrs.value === '')).toBe(true);
  });

  it('offers the missing-measure guidance without editable fields', () => {
    const { markup, tree } = renderComponent(WorkplaceAccommodationProcessDetail, { onUpdate: vi.fn() });
    expect(visibleText(markup)).toContain('Wähle eine Arbeitsplatzgestaltungsmaßnahme');
    expect(descendants(tree).filter((node) => ['input', 'textarea', 'select'].includes(node.tag))).toHaveLength(0);
  });
});
