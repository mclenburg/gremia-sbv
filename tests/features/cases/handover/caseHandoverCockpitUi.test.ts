import { describe, expect, it } from 'vitest';
import { CaseHandoverCasePicker } from '../../../../src/app/features/case-handover/CaseHandoverCasePicker';
import { MobileSnapshotResultPanel } from '../../../../src/app/features/case-handover/HandoverMobileCompanionTab';
import { activeMobileWorkCases, filterHandoverCases, toggleHandoverCase } from '../../../../src/app/features/case-handover/caseHandoverCockpitPolicy';
import type { CaseRecord } from '../../../../src/domain/models/case.model';
import type { CaseMeasureRecord } from '../../../../src/domain/models/case-measure.model';
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
    isPseudonymized: false,
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

  it('bietet offene Mobile-Arbeitsfälle auch pseudonymisiert und mit fachlichen Maßnahmenstatuswerten an', () => {
    const cases = [
      caseRecord(1),
      caseRecord(2),
      caseRecord(3),
      { ...caseRecord(4), status: 'abgeschlossen' as const },
      caseRecord(5),
    ];
    const measures = [
      measureRecord('measure-1', 'case-1', 'neu'),
      measureRecord('measure-2', 'case-2', 'completed'),
      measureRecord('measure-3', 'case-3', 'abgeschlossen'),
    ];

    expect(activeMobileWorkCases(cases, measures).map((record) => record.id)).toEqual(['case-1', 'case-5']);
  });

  it('zeigt Mobile-Snapshots als scannbare QR-Frames mit bedienbarer Fallback-Ausgabe', () => {
    const rendered = renderComponent(MobileSnapshotResultPanel, {
      snapshot: {
        packageId: 'mobile-snapshot-1',
        targetInstanceId: 'GSBV1',
        serializedEnvelope: 'verschluesselter-snapshot',
        createdAt: '2026-09-10T10:00:00.000Z',
        caseCount: 2,
        deadlineCount: 3,
        qrFrames: ['gsbvmobile://v1/frame-1', 'gsbvmobile://v1/frame-2'],
      },
      onCopyFrame: () => undefined,
    });
    const text = visibleText(rendered.markup);
    const nodes = descendants(rendered.tree);

    expect(nodes.some((node) => node.tag === 'svg')).toBe(true);
    expect(text).toContain('Frame 1 von 2');
    expect(text).toContain('Automatik pausieren');
    expect(text).toContain('Übertragung abbrechen');
    expect(text).toContain('Tempo');
    expect(text).toContain('Nächster Frame');
    expect(nodes.some((node) => node.tag === 'textarea' && node.attrs.readOnly !== undefined)).toBe(true);
  });
});

function measureRecord(id: string, caseId: string, status: string): CaseMeasureRecord {
  return {
    id,
    caseId,
    type: 'sbv_participation',
    title: 'SBV-Beteiligung',
    status: status as CaseMeasureRecord['status'],
    riskLevel: 'normal',
    createdFrom: 'manual',
    openedAt: '2026-09-05T08:00:00.000Z',
    requiresFollowUp: true,
    createdAt: '2026-09-05T08:00:00.000Z',
    updatedAt: '2026-09-05T08:00:00.000Z',
  };
}
