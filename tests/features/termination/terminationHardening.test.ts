import { describe, expect, it, vi } from 'vitest';
import { TerminationProcessDetail } from '../../../src/app/features/termination/TerminationProcessDetail';
import type { TerminationHearingRecord } from '../../../src/domain/models/termination.model';
import { evaluateTerminationWarnings, suggestedStatementDueAt } from '../../../services/terminationWorkflowPolicy';
import { descendants, renderComponent, visibleText } from '../../helpers/renderedMarkup';

function process(overrides: Partial<TerminationHearingRecord> = {}): TerminationHearingRecord {
  return {
    id: 'termination-1',
    caseId: 'case-1',
    status: 'eingang',
    terminationType: 'ordentlich',
    protectionStatus: 'schwerbehindert',
    receivedAt: '2026-05-01T08:00:00.000Z',
    employerReason: 'betriebsbedingt',
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('0.7.2 Kündigungsanhörung fachliche Härtung', () => {
  it.each([
    { receivedAt: undefined },
    { receivedAt: 'ungueltig' },
    { sbvStatementDueAt: '2031-05-12T08:00:00.000Z' },
  ])('bietet ohne gültigen Eingang oder bei gespeicherter Frist keine neue Frist an: %j', (overrides) => {
    const onUpdate = vi.fn(async () => undefined);
    const { markup } = renderComponent(TerminationProcessDetail, { process: process(overrides), onUpdate });
    expect(visibleText(markup)).not.toContain('Frist vorschlagen:');
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('zeigt gespeicherte Stellungnahmedaten mit eindeutig verbundenen Eingabelabels ohne Änderung', () => {
    const onUpdate = vi.fn(async () => undefined);
    const { markup, tree } = renderComponent(TerminationProcessDetail, {
      process: process({ employerReason: 'Synthetischer Vortrag', missingInformation: 'Synthetische Nachforderung',
        sbvAssessment: 'Synthetische Bewertung', statement: 'Synthetische Stellungnahme', integrationOfficeDecision: 'Synthetische Entscheidung' }),
      onUpdate,
    });
    const nodes = descendants(tree);
    const fields = nodes.filter((node) => node.tag === 'textarea');
    expect(fields).toHaveLength(5);
    for (const field of fields) {
      expect(field.attrs.id).toBeTruthy();
      expect(nodes.filter((node) => node.tag === 'label' && node.attrs.for === field.attrs.id)).toHaveLength(1);
    }
    for (const value of ['Synthetischer Vortrag', 'Synthetische Nachforderung', 'Synthetische Bewertung', 'Synthetische Stellungnahme', 'Synthetische Entscheidung']) {
      expect(visibleText(markup)).toContain(value);
    }
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('berechnet Fristvorschläge fachlich nach Kündigungsart', () => {
    expect(suggestedStatementDueAt('2026-05-01T08:00:00.000Z', 'ordentlich')).toBe('2026-05-08T08:00:00.000Z');
    expect(suggestedStatementDueAt('2026-05-01T08:00:00.000Z', 'ausserordentlich')).toBe('2026-05-04T08:00:00.000Z');
    expect(suggestedStatementDueAt('2026-05-01T08:00:00.000Z', 'verdachtskuendigung')).toBe('2026-05-04T08:00:00.000Z');
  });

  it('behandelt unklaren Schutzstatus und fehlende Integrationsamt-Dokumentation als kritisch', () => {
    const warnings = evaluateTerminationWarnings(process({ protectionStatus: 'unklar', integrationOfficeRequestedAt: undefined, integrationOfficeDecisionAt: undefined }));
    expect(warnings.some((warning) => warning.level === 'critical' && warning.message.includes('Schutzstatus ist nicht geklärt'))).toBe(true);

    const protectedWarnings = evaluateTerminationWarnings(process({ protectionStatus: 'schwerbehindert', integrationOfficeRequestedAt: undefined, integrationOfficeDecisionAt: undefined }));
    expect(protectedWarnings.some((warning) => warning.level === 'critical' && warning.message.includes('Zustimmung des Integrationsamts'))).toBe(true);
  });

  it('zeigt eine Due-Date-Arbeitshilfe und die Kündigungsführung im Detailformular', () => {
    const { markup, tree } = renderComponent(TerminationProcessDetail, {
      process: process({ sbvStatementDueAt: undefined }),
      onUpdate: async () => undefined,
      onOpenTemplates: () => undefined,
    });

    const text = visibleText(markup);
    expect(text).toContain('Frist vorschlagen');
    expect(text).toContain('Fristvorschläge sind Arbeitshilfen');
    expect(text).toContain('Kündigungsanhörung-Statusführung');
    expect(markup).toMatch(/0?8\.0?5\.2026/);
    expect(descendants(tree).some((node) => node.attrs.class?.includes('termination-guidance-actions'))).toBe(true);
  });
});
