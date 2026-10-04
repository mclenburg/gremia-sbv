import { describe, expect, it } from 'vitest';
import { PersonPrivacyActionDialog } from '../../../src/app/features/persons/PersonPrivacyActionDialog';
import { descendants, renderComponent, visibleText } from '../../helpers/renderedMarkup';

describe('Datenschutzaktionen am Personenstamm', () => {
  it.each([
    ['anonymize', 'Person anonymisieren'],
    ['delete', 'Person löschen'],
  ] as const)('zeigt %s in einem zentral fokusverwalteten Dialog', (mode, title) => {
    const { markup, tree } = renderComponent(PersonPrivacyActionDialog, {
      open: true,
      mode,
      person: null,
      affectedCaseCount: 0,
      onClose: () => undefined,
      onSubmit: async () => undefined,
      onError: () => undefined,
    });

    const dialog = descendants(tree).find((node) => node.attrs.role === 'dialog');
    expect(dialog?.attrs['aria-modal']).toBe('true');
    expect(dialog?.attrs['aria-labelledby']).toBeTruthy();
    expect(dialog?.attrs['aria-describedby']).toBeTruthy();
    expect(dialog?.attrs['data-focus-managed']).toBe('true');
    expect(visibleText(markup)).toContain(title);
    expect(visibleText(markup)).toContain('Sicherheitseinträge im Audit-Log');
  });
});
