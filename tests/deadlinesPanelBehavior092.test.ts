import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { DeadlinesView } from '../src/app/features/deadlines/DeadlinesView';
import { DeadlineCreateModal } from '../src/app/features/deadlines/DeadlineCreateModal';
import { DeadlineIcalExportModal } from '../src/app/features/deadlines/DeadlineIcalExportPanel';
import { filtersForDeadlineExportScope, resolveDeadlineWorkSummary } from '../src/app/features/deadlines/deadlineViewLogic';
import type { CaseRecord } from '../src/app/core/models/case.model';
import type { DeadlineRecord } from '../src/app/core/models/deadline.model';
import { LiveRegionProvider } from '../src/app/shared/a11y/LiveRegionProvider';
import { renderComponent, renderElement, visibleText } from './helpers/renderedMarkup';

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

describe('Fristenpanel Verhalten 0.9.2', () => {
  it('rendert die Fristenseite als Arbeitsübersicht statt als eingebettetes Erfassungsformular', () => {
    const { markup } = renderComponent(DeadlinesView, {
      cases: [caseRecord()],
      deadlines: [deadline()],
      measures: [],
      onCreateDeadline: async () => undefined,
      onEditDeadline: () => undefined,
      onCompleteDeadline: () => undefined,
      onExportIcal: async () => undefined,
    });

    const text = visibleText(markup);
    expect(text).toContain('Übersicht, Priorisierung und Kontrolle zeitkritischer SBV-Arbeit');
    expect(text).toContain('Fristenregister');
    expect(text).toContain('Kalender exportieren');
    expect(text).toContain('Journal');
    expect(text).toContain('Frist anlegen');
    expect(text).not.toContain('Fristdaten');
    expect(text.indexOf('Fristenregister')).toBeLessThan(text.indexOf('BEM-Rückmeldung prüfen'));
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
    expect(visibleText(create.markup)).toContain('Freie Wiedervorlage ohne Fallbezug');
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
