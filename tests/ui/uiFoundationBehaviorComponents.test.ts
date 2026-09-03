import { describe, expect, it } from 'vitest';
import { modules } from '../../src/app/core/navigation/modules';
import { buildDashboardFocusSummary } from '../../src/app/features/dashboard/dashboardFocus';
import { TextCommandTextarea } from '../../src/app/shared/textCommands/TextCommandTextarea';
import { bindingLabel, CaseOverviewDetail, resolveCaseNextAction } from '../../src/app/features/cases/CaseOverviewDetail';
import { lifecycleSeverity, personLabel, PersonList } from '../../src/app/features/persons/PersonList';
import type { CaseRecord } from '../../src/domain/models/case.model';
import type { DeadlineDashboardItem, DeadlineRecord } from '../../src/domain/models/deadline.model';
import type { ProtectedPersonRecord } from '../../src/domain/models/protected-person.model';
import { descendants, renderComponent, visibleText } from '../helpers/renderedMarkup';
import { SelectInput } from '../../src/app/shared/components/IndustrialForm';

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

function deadline(overrides: Partial<DeadlineRecord & DeadlineDashboardItem> = {}): DeadlineRecord & DeadlineDashboardItem {
  return {
    id: 'deadline-1',
    processType: 'case',
    deadlineType: 'follow_up',
    title: 'Stellungnahme vorbereiten',
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
    dashboardState: 'critical',
    hoursRemaining: 2,
    safeTitle: 'Stellungnahme vorbereiten',
    actionHint: 'Heute bearbeiten',
    ...overrides,
  };
}

function person(overrides: Partial<ProtectedPersonRecord> = {}): ProtectedPersonRecord {
  return {
    id: 'person-1',
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T08:00:00.000Z',
    recordKind: 'identified_person',
    firstName: 'Ada',
    lastName: 'Lovelace',
    pseudonymLabel: 'AL',
    personnelNumber: 'PN-1',
    workEmail: 'ada@example.test',
    organizationalUnit: 'SBV-Test',
    location: 'Rostock',
    employmentState: 'active_employee',
    protectionStatus: 'severely_disabled',
    statusSource: 'manual',
    lifecycleState: 'active',
    ...overrides,
  };
}

describe('UI-Fundament Block 4 Verhalten', () => {

  it('macht Auswahlen mit mehr als fünf Optionen automatisch filterbar', () => {
    const { tree } = renderComponent(SelectInput, {
      label: 'Vorgang auswählen',
      value: '',
      onValueChange: () => undefined,
      options: Array.from({ length: 6 }, (_, index) => ({ value: String(index), label: `Vorgang ${index + 1}` })),
    });
    const nodes = descendants(tree);
    expect(nodes.some((node) => node.tag === 'input' && node.attrs.type === 'search')).toBe(true);
    expect(nodes.some((node) => node.tag === 'datalist')).toBe(true);
    expect(nodes.some((node) => node.tag === 'select')).toBe(false);
  });

  it('hält Kurzbefehlerklärungen standardmäßig aus Arbeitsfeldern heraus', () => {
    const { markup } = renderComponent(TextCommandTextarea, { fieldId: 'test-field', value: '', onChange: () => undefined });
    expect(visibleText(markup)).not.toContain('Strg+H');
    expect(markup).not.toContain('text-command-hint');
  });

  it('priorisiert die aktuelle Dashboard-Fokussicht nach offenen Fristen und Compliance-Warnungen', () => {
    expect(buildDashboardFocusSummary({
      cases: [caseRecord({ status: 'in_bearbeitung' })],
      deadlines: [deadline({ status: 'overdue', severity: 'critical' })],
      compliance: { ok: true, issueCount: 0 },
      referenceDate: new Date('2026-05-30T12:00:00.000Z'),
    })).toMatchObject({
      cases: { open: 1, marker: 'attention' },
      deadlines: { totalOpen: 1, overdue: 1, marker: 'warning' },
      compliance: { ok: true, marker: 'ok' },
    });

    expect(buildDashboardFocusSummary({
      cases: [],
      deadlines: [],
      compliance: { ok: false, issueCount: 1 },
    })).toMatchObject({
      deadlines: { marker: 'ok' },
      compliance: { ok: false, warnings: 1, marker: 'warning' },
    });
  });

  it('hält reine Cockpit-Module aus der Hauptnavigation heraus', () => {
    const visibleProcessModules = modules
      .filter((module) => module.group === 'processes' && module.showInNavigation !== false)
      .map((module) => module.id);

    expect(visibleProcessModules).toEqual(['participation_violations', 'recruiting_participations', 'equalization', 'elections']);
    expect(modules.find((module) => module.id === 'bem')).toMatchObject({ showInNavigation: false });
    expect(modules.find((module) => module.id === 'prevention')).toMatchObject({ showInNavigation: false });
    expect(modules.find((module) => module.id === 'participation')).toMatchObject({ showInNavigation: false });
  });

  it('leitet in der Fallübersicht zuerst Datenschutz- und Übergabehandlungen ab', () => {
    expect(resolveCaseNextAction(caseRecord({ handoverStatus: 'expired' }))).toMatchObject({
      title: 'Übergabe abgelaufen',
      tone: 'danger',
    });
    expect(resolveCaseNextAction(caseRecord({ personBindingState: 'legacy_unlinked' }))).toMatchObject({
      title: 'Datenschutzprüfung vor Weiterbearbeitung',
      tone: 'warning',
    });
    expect(bindingLabel(caseRecord({ personBindingState: 'anonymous_request' }))).toBe('Anonyme Anfrage');
  });

  it('rendert Fallübersichten mit sichtbarem nächstem Schritt und Statusbadges', () => {
    const { markup, tree } = renderComponent(CaseOverviewDetail, {
      selectedCase: caseRecord({ priority: 'kritisch', privacyReviewRequired: true }),
      notesCount: 1,
      documentsCount: 2,
      legalReferencesCount: 3,
      processesCount: 4,
    });

    const text = visibleText(markup);
    expect(text).toContain('Nächster sauberer Schritt');
    expect(text).toContain('Datenschutzprüfung vor Weiterbearbeitung');
    expect(text).toContain('kritisch');
    expect(descendants(tree).some((node) => node.attrs.class?.includes('industrial-status-badge'))).toBe(true);
  });

  it('zeigt pseudonyme Personen als solche und bewertet Lifecycle-Zustände handlungsorientiert', () => {
    const pseudonymous = person({ recordKind: 'pseudonymous_request', pseudonymLabel: 'Anfrage A', lifecycleState: 'expired_review_required' });

    expect(personLabel(pseudonymous)).toBe('Anfrage A');
    expect(lifecycleSeverity('expired_review_required')).toBe('critical');
    expect(lifecycleSeverity('expiring_soon')).toBe('warning');

    const { markup } = renderComponent(PersonList, {
      persons: [pseudonymous],
      selectedId: pseudonymous.id,
      onSelect: () => undefined,
      onEdit: () => undefined,
      onDelete: () => undefined,
    });

    const text = visibleText(markup);
    expect(text).toContain('pseudonym · nicht re-identifizieren');
    expect(text).toContain('Datenschutzprüfung erforderlich');
  });
});
