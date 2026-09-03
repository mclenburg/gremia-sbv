import { describe, expect, it, vi } from 'vitest';
import { CaseCreateModal } from '../../../src/app/features/cases/CaseCreateModal';
import { LegacyCaseBindingDialog } from '../../../src/app/features/cases/LegacyCaseBindingDialog';
import type { CaseRecord } from '../../../src/domain/models/case.model';
import type { ProtectedPersonRecord } from '../../../src/domain/models/protected-person.model';
import { descendants, renderComponent, visibleText } from '../../helpers/renderedMarkup';

function person(id: string, lastName: string): ProtectedPersonRecord {
  return {
    id,
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T08:00:00.000Z',
    recordKind: 'identified_person',
    firstName: `Vorname ${id}`,
    lastName,
    employmentState: 'active_employee',
    protectionStatus: 'severely_disabled',
    statusSource: 'manual',
    lifecycleState: 'active',
  };
}

const legacyCase: CaseRecord = {
  id: 'case-legacy',
  caseNumber: 'ALT-2024-001',
  displayName: 'Altfall ohne sichere Person',
  category: 'sonstiges',
  status: 'offen',
  priority: 'normal',
  openedAt: '2024-01-10T08:00:00.000Z',
  isPseudonymized: false,
  isLocked: false,
  personBindingState: 'legacy_unlinked',
  privacyReviewRequired: true,
};

const persons = Array.from({ length: 8 }, (_, index) => person(`person-${index + 1}`, `Nachname ${index + 1}`));

describe('Legacy-Fall-Zuordnung und große Fallauswahlen', () => {
  it('rendert die Altfall-Zuordnung als zentrales Modal mit suchbarer Personenauswahl', () => {
    const { markup, tree } = renderComponent(LegacyCaseBindingDialog, {
      open: true,
      legacyCase,
      persons,
      onClose: vi.fn(),
      onAssign: async () => undefined,
    });

    const nodes = descendants(tree);
    const dialog = nodes.find((node) => node.tag === 'section' && node.attrs['data-e2e'] === 'legacy-case-binding-dialog');
    expect(dialog?.attrs['data-focus-managed']).toBe('true');
    expect(nodes.some((node) => node.tag === 'input' && node.attrs.type === 'search')).toBe(true);
    expect(nodes.some((node) => node.tag === 'select')).toBe(true);
    expect(visibleText(markup)).toContain('Prüfgrund');
    expect(visibleText(markup)).toContain('Zuordnung speichern');
  });

  it('macht die Personenauswahl in der Fallanlage bei großen Listen filterbar', () => {
    const { tree } = renderComponent(CaseCreateModal, {
      open: true,
      caseNumber: '',
      displayName: '',
      category: 'bem',
      summary: '',
      selectedProtectedPersonId: '',
      protectedPersons: persons,
      onCaseNumberChange: vi.fn(),
      onDisplayNameChange: vi.fn(),
      onCategoryChange: vi.fn(),
      onSummaryChange: vi.fn(),
      onProtectedPersonChange: vi.fn(),
      onCancel: vi.fn(),
      onSubmit: vi.fn(),
      onAnonymousSubmit: vi.fn(),
    });

    const nodes = descendants(tree);
    expect(nodes.some((node) => node.tag === 'input' && node.attrs.type === 'search')).toBe(true);
    expect(nodes.some((node) => node.tag === 'datalist')).toBe(true);
  });
});
