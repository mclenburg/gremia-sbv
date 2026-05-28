import { describe, expect, it } from 'vitest';
import { TerminationProcessDetail } from '../src/app/features/termination/TerminationProcessDetail';
import type { TerminationHearingRecord } from '../src/app/core/models/termination.model';
import { evaluateTerminationWarnings, suggestedStatementDueAt } from '../services/terminationWorkflowPolicy';
import { descendants, renderComponent, visibleText } from './helpers/renderedMarkup';

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
    const suggestedDue = suggestedStatementDueAt('2026-05-01T08:00:00.000Z', 'ordentlich');
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
