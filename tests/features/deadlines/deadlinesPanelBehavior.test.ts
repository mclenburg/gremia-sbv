import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { DeadlinesView } from '../../../src/app/features/deadlines/DeadlinesView';
import { DeadlineCreateModal } from '../../../src/app/features/deadlines/DeadlineCreateModal';
import { DeadlineIcalExportModal } from '../../../src/app/features/deadlines/DeadlineIcalExportPanel';
import { filtersForDeadlineExportScope, resolveDeadlineWorkSummary } from '../../../src/app/features/deadlines/deadlineViewLogic';
import { resolveDeadlineContextInfo, resolveDeadlineOpenTarget } from '../../../src/app/features/deadlines/deadlineContext';
import type { CaseRecord } from '../../../src/domain/models/case.model';
import type { CaseMeasureRecord } from '../../../src/domain/models/case-measure.model';
import type { DeadlineRecord } from '../../../src/domain/models/deadline.model';
import { LiveRegionProvider } from '../../../src/app/shared/a11y/LiveRegionProvider';
import { renderComponent, renderElement, visibleText } from '../../helpers/renderedMarkup';

function caseRecord(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: 'case-1',
    caseNumber: 'SBV-2026-001',
    displayName: 'Testfall',
    category: 'bem',
    status: 'in_bearbeitung',
    priority: 'normal',
    openedAt: '2026-05-01T08:00:00.000Z',
    isPseudonymized: false,
    isLocked: false,
    personBindingState: 'active',
    ...overrides,
  };
}

function deadline(overrides: Partial<DeadlineRecord> = {}): DeadlineRecord {
  return {
    id: 'deadline-1',
    processType: 'bem',
    deadlineType: 'follow_up',
    title: 'BEM-Rückmeldung prüfen',
    dueAt: '2026-05-29T12:00:00.000Z',
    severity: 'critical',
    status: 'open',
    calculationMode: 'manual',
    isLegalDeadline: false,
    isUserEditable: true,
    warningThresholdHours: 48,
    criticalThresholdHours: 24,
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T08:00:00.000Z',
    ...overrides,
  };
}

function measure(overrides: Partial<CaseMeasureRecord> = {}): CaseMeasureRecord {
  return {
    id: 'measure-1',
    caseId: 'case-1',
    type: 'bem',
    title: 'BEM-Gespräch vorbereiten',
    status: 'open',
    riskLevel: 'normal',
    createdFrom: 'manual',
    openedAt: '2026-05-01T08:00:00.000Z',
    requiresFollowUp: true,
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('Fristenpanel Verhalten 0.9.2', () => {
  it('rendert die Fristenseite als Arbeitsübersicht statt als eingebettetes Erfassungsformular', () => {
    const { markup } = renderComponent(DeadlinesView, {
      cases: [caseRecord()],
      deadlines: [deadline()],
      measures: [measure()],
      onCreateDeadline: async () => undefined,
      onEditDeadline: () => undefined,
      onExtendDeadline: () => undefined,
      onOpenDeadlineContext: () => undefined,
      onCompleteDeadline: () => undefined,
      onExportIcal: async () => undefined,
    });

    const text = visibleText(markup);
    expect(text).toContain('Übersicht, Priorisierung und Kontrolle zeitkritischer SBV-Arbeit');
    expect(text).toContain('Fristenregister');
    expect(text).toContain('Kalender exportieren');
    expect(text).toContain('Journal');
    expect(text).toContain('Verlängern');
    expect(text).toContain('Frist anlegen');
    expect(text).not.toContain('Fristdaten');
    expect(text.indexOf('Fristenregister')).toBeLessThan(text.indexOf('BEM-Rückmeldung prüfen'));
  });

  it('löst Dashboard-Fristen auf ihren fachlichen Kontext und das nächste übergeordnete Objekt auf', () => {
    const casesById = new Map([[caseRecord().id, caseRecord()]]);
    const measuresById = new Map([[measure().id, measure({ type: 'sbv_participation', title: 'Unterrichtung nachfordern' })]]);
    const measureDeadline = deadline({ caseId: 'case-1', measureId: 'measure-1', processType: 'case' });
    const freeDeadline = deadline({ id: 'deadline-free', caseId: undefined, processType: 'custom', deadlineType: 'follow_up' });

    expect(resolveDeadlineContextInfo(measureDeadline, casesById, measuresById)).toMatchObject({
      primary: 'SBV-2026-001 · Testfall',
      secondary: 'SBV-Beteiligung · Unterrichtung nachfordern',
      actionLabel: 'Maßnahme öffnen',
    });
    expect(resolveDeadlineOpenTarget(measureDeadline, measuresById)).toEqual({
      kind: 'case',
      target: { caseId: 'case-1', nodeType: 'participation', nodeId: 'measure-1' },
    });
    expect(resolveDeadlineContextInfo(freeDeadline).actionLabel).toBe('Fristenregister öffnen');
    expect(resolveDeadlineOpenTarget(freeDeadline)).toEqual({ kind: 'view', view: 'deadlines' });
  });

  it('trennt Erfassung und Export in zentrale Modal-Komponenten', () => {
    const create = renderComponent(DeadlineCreateModal, {
      cases: [caseRecord()],
      onCreateDeadline: async () => undefined,
      onClose: () => undefined,
    });
    const exportModal = renderElement(createElement(LiveRegionProvider, {
      children: createElement(DeadlineIcalExportModal, {
        onExport: async () => undefined,
        onClose: () => undefined,
      }),
    }));

    expect(visibleText(create.markup)).toContain('Frist oder Wiedervorlage anlegen');
    expect(visibleText(create.markup)).toContain('Kein Fallbezug');
    expect(visibleText(create.markup)).toContain('Fallfreie Rechtsfristen und Verfahrensschritte sind zulässig');
    expect(visibleText(exportModal.markup)).toContain('Kalenderdatei exportieren');
    expect(visibleText(exportModal.markup)).toContain('Vorgangstyp · Standard');
    expect(visibleText(exportModal.markup)).not.toContain('process_type · Standard');
  });

  it('berechnet Fristen-Kennzahlen und iCal-Filter fachlich ohne technische UI-Begriffe', () => {
    const referenceDate = new Date('2026-05-29T10:00:00.000Z');
    expect(resolveDeadlineWorkSummary([
      deadline({ dueAt: '2026-05-29T09:00:00.000Z', status: 'overdue' }),
      deadline({ id: 'deadline-2', dueAt: '2026-05-29T20:00:00.000Z', criticalThresholdHours: 4 }),
      deadline({ id: 'deadline-3', dueAt: '2026-05-30T20:00:00.000Z', criticalThresholdHours: 4 }),
      deadline({ id: 'deadline-4', processType: 'custom', deadlineType: 'follow_up', caseId: undefined }),
      deadline({ id: 'deadline-5', processType: 'sbv_control_protocol', deadlineType: 'follow_up', caseId: undefined, processId: 'protocol-1' }),
    ], referenceDate)).toMatchObject({
      overdueCount: 1,
      criticalCount: 2,
      dueSoonCount: 2,
      openCount: 5,
      freeFollowUpCount: 2,
    });

    expect(filtersForDeadlineExportScope('open')).toEqual({ status: ['open', 'overdue'] });
    expect(filtersForDeadlineExportScope('dashboard')).toEqual({ status: ['open', 'overdue'], dashboardOnly: true });
    expect(filtersForDeadlineExportScope('all')).toEqual({});
  });
});
