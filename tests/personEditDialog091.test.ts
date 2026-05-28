import { describe, expect, it } from 'vitest';
import { PersonEditDialog } from '../src/app/features/persons/PersonEditDialog';
import type { ProtectedPersonRecord } from '../src/app/core/models/protected-person.model';
import { descendants, renderComponent, visibleText } from './helpers/renderedMarkup';

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
    notes: 'Notiz',
    ...overrides,
  };
}

describe('0.9.1 Personenbearbeitung', () => {
  it('rendert einen Modal-Workflow zur manuellen Bearbeitung aller zentralen Personenfelder', () => {
    const { markup, tree } = renderComponent(PersonEditDialog, {
      open: true,
      person: person(),
      onClose: () => undefined,
      onUpdate: async () => undefined,
      onUpdated: () => undefined,
      onError: () => undefined,
    });

    const dialog = descendants(tree).find((node) => node.tag === 'section' && node.attrs.role === 'dialog');
    expect(dialog?.attrs['aria-modal']).toBe('true');
    expect(dialog?.attrs['aria-labelledby']).toBe('person-edit-heading');
    expect(dialog?.attrs['aria-describedby']).toBe('person-edit-description');

    const text = visibleText(markup);
    for (const label of ['Vorname', 'Nachname', 'Pseudonym/Label', 'Personalnummer', 'Dienstliche E-Mail', 'Organisationseinheit', 'Standort', 'Schutzstatus', 'Beschäftigungsstatus', 'Notiz']) {
      expect(text).toContain(label);
    }
  });

  it('rendert bei geschlossenem Dialog keinen bearbeitbaren Personeninhalt', () => {
    const { markup } = renderComponent(PersonEditDialog, {
      open: false,
      person: person(),
      onClose: () => undefined,
      onUpdate: async () => undefined,
      onUpdated: () => undefined,
      onError: () => undefined,
    });

    expect(visibleText(markup)).not.toContain('Person bearbeiten');
  });
});
