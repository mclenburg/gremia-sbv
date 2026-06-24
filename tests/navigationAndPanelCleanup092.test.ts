import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ShellNav } from '../src/app/shell/ShellNav';
import { moduleGroups, modules } from '../src/app/core/navigation/modules';
import { ContactsView } from '../src/app/features/contacts/ContactsView';
import { ContactCreateModal } from '../src/app/features/contacts/ContactCreateModal';
import type { ContactRecord } from '../src/app/core/models/contact.model';
import { ConfirmDialogProvider } from '../src/app/shared/dialogs/ConfirmDialogProvider';
import { LiveRegionProvider } from '../src/app/shared/a11y/LiveRegionProvider';
import { renderComponent, renderElement, visibleText } from './helpers/renderedMarkup';

function contactRecord(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return {
    id: 'contact-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    organization: 'Inklusionsamt',
    role: 'Beratung',
    category: 'inklusionsamt',
    email: 'ada@example.test',
    phone: '0381 000',
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('Navigation und Panel-Cleanup 0.9.2', () => {
  it('gruppiert die Sidebar fachlich statt alle Module als flache Liste zu zeigen', () => {
    const { markup } = renderComponent(ShellNav, {
      current: 'deadlines',
      onNavigate: () => undefined,
    });
    const text = visibleText(markup);

    expect(moduleGroups.map((group) => group.label)).toEqual(['Kernarbeit', 'SBV-Verfahren', 'Werkzeuge', 'Administration']);
    expect(modules.filter((module) => module.group === 'core').map((module) => module.id)).toEqual(['persons', 'cases', 'deadlines', 'activity_journal']);
    expect(text).toContain('Kernarbeit');
    expect(text).toContain('SBV-Verfahren');
    expect(text).toContain('Werkzeuge');
    expect(text).toContain('Konfiguration');
    expect(text.indexOf('Kernarbeit')).toBeLessThan(text.indexOf('Personen'));
    expect(text.indexOf('Werkzeuge')).toBeLessThan(text.indexOf('Vorlagen'));
  });

  it('zeigt Kontakte als Register mit Modal-Erfassung statt als dauerhaft eingebettetes Anlegeformular', () => {
    const element = createElement(LiveRegionProvider, {
      children: createElement(ConfirmDialogProvider, {
        children: createElement(ContactsView, {
          contacts: [contactRecord()],
          onCreateContact: async () => contactRecord({ id: 'contact-2' }),
          onDeleteContact: async () => ({ deleted: true, anonymizedReferences: 0, touchedNotes: 0 }),
        }),
      }),
    });
    const { markup } = renderElement(element);
    const text = visibleText(markup);

    expect(text).toContain('Kontaktliste');
    expect(text).toContain('Kontakt anlegen');
    expect(text).toContain('ada@example.test');
    expect(text).not.toContain('Kontaktdaten');
    expect(text).not.toContain('Vorname Nachname Firma / Stelle');
  });

  it('nutzt für die Kontakt-Erfassung ein zentrales Industrial-Modal', () => {
    const { markup } = renderComponent(ContactCreateModal, {
      onCreateContact: async () => contactRecord({ id: 'contact-2' }),
      onCreated: () => undefined,
      onClose: () => undefined,
    });
    const text = visibleText(markup);

    expect(markup).toContain('data-industrial-modal="true"');
    expect(text).toContain('Kontakt anlegen');
    expect(text).toContain('Kontaktdaten');
    expect(text).toContain('Kontakt speichern');
  });
});
