import { describe, expect, it } from 'vitest';
import type { CreateTemplateInput } from '../../../src/domain/models/template.model';
import { TemplateEditorModal } from '../../../src/app/features/templates/TemplateEditorModal';
import { descendants, renderComponent, visibleText } from '../../helpers/renderedMarkup';

const draft: CreateTemplateInput = {
  title: '',
  category: 'sonstiges',
  subject: '',
  body: '',
  legalBasis: [],
  tags: [],
};

describe('Vorlageneditor', () => {
  it('zeigt die zentralen Formularfelder in einem fokusverwalteten Dialog', () => {
    const { markup, tree } = renderComponent(TemplateEditorModal, {
      mode: 'create',
      draft,
      categories: ['sonstiges'],
      processStatus: '',
      onDraftChange: () => undefined,
      onProcessStatusChange: () => undefined,
      onSubmit: () => undefined,
      onClose: () => undefined,
    });

    const dialog = descendants(tree).find((node) => node.attrs.role === 'dialog');
    expect(dialog?.attrs['data-focus-managed']).toBe('true');
    expect(dialog?.attrs['aria-labelledby']).toBeTruthy();
    const text = visibleText(markup);
    for (const label of ['Vorlagendaten', 'Titel', 'Kategorie', 'Normen', 'Tags', 'Textinhalt', 'Beschreibung', 'Betreff', 'Text', 'Vorlage speichern']) {
      expect(text).toContain(label);
    }
  });
});
