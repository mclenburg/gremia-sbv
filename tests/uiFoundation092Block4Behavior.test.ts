import { describe, expect, it } from 'vitest';
import { DashboardOverview, groupDashboardModules, resolveDashboardWorkdaySummary } from '../src/app/features/dashboard/DashboardOverview';
import { bindingLabel, CaseOverviewDetail, resolveCaseNextAction } from '../src/app/features/cases/CaseOverviewDetail';
import { lifecycleSeverity, personLabel, PersonList } from '../src/app/features/persons/PersonList';
import type { CaseRecord } from '../src/app/core/models/case.model';
import type { DeadlineDashboardItem, DeadlineRecord } from '../src/app/core/models/deadline.model';
import type { ProtectedPersonRecord } from '../src/app/core/models/protected-person.model';
import { descendants, renderComponent, visibleText } from './helpers/renderedMarkup';

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
  it('priorisiert das Dashboard nach kritischen Fristen, 48h-Fristen und Datenschutzprüfungen', () => {
    expect(resolveDashboardWorkdaySummary({
      cases: [caseRecord({ privacyReviewRequired: true })],
      deadlines: [deadline()],
      dashboardItems: [deadline()],
    })).toMatchObject({
      criticalCount: 1,
      dueSoonCount: 0,
      privacyReviewCount: 1,
      nextActionTone: 'danger',
      nextActionTitle: '1 kritische Frist',
    });

    expect(resolveDashboardWorkdaySummary({
      cases: [caseRecord({ privacyReviewRequired: true })],
      deadlines: [],
      dashboardItems: [],
    })).toMatchObject({
      nextActionTone: 'warning',
      nextActionTitle: '1 Datenschutzprüfung',
    });
  });

  it('gruppiert Dashboard-Module in Kernarbeit, SBV-Verfahren, Werkzeuge und Administration', () => {
    const groups = groupDashboardModules();

    expect(groups.map((group) => group.id)).toEqual(['core', 'processes', 'tools', 'administration']);
    expect(groups.find((group) => group.id === 'core')?.modules.map((module) => module.id)).toEqual(['persons', 'cases', 'deadlines']);
    expect(groups.find((group) => group.id === 'processes')?.modules.map((module) => module.id)).toContain('termination_hearing');
  });

  it('rendert das Dashboard als Tagessteuerung vor den Modulgruppen', () => {
    const { markup } = renderComponent(DashboardOverview, {
      onNavigate: () => undefined,
      cases: [caseRecord({ status: 'in_bearbeitung' })],
      deadlines: [deadline()],
      dashboardItems: [deadline()],
      onEditDeadline: () => undefined,
      onCompleteDeadline: () => undefined,
    });

    const text = visibleText(markup);
    expect(text).toContain('Was heute wichtig ist');
    expect(text).toContain('Nächster sauberer Schritt');
    expect(text.indexOf('Nächster sauberer Schritt')).toBeLessThan(text.indexOf('Kernarbeit'));
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
