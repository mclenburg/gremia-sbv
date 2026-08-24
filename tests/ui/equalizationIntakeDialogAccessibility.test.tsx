import { describe, expect, it } from 'vitest';
import { EqualizationIntakeDialog } from '../../src/app/features/equalization/EqualizationIntakeDialog';
import { descendants, renderComponent, visibleText } from '../helpers/renderedMarkup';

describe('Geführte Gleichstellungs-/GdB-Erstanlage', () => {
  it('macht den erzeugten Verbund sichtbar und zeigt nur im Startstatus erforderliche Felder', () => {
    const { markup, tree } = renderComponent(EqualizationIntakeDialog, {
      persons: [],
      onClose: () => undefined,
      onCreate: async () => { throw new Error('wird im Render-Test nicht ausgeführt'); },
    });
    const nodes = descendants(tree);
    const text = visibleText(markup);

    expect(text).toContain('Personeneintrag');
    expect(text).toContain('verknüpfte Fallakte');
    expect(text).toContain('Gleichstellungs-/GdB-Verfahren');
    expect(text).toContain('Die Löschung bleibt manuell');
    expect(nodes.some((node) => node.tag === 'form' && node.attrs.id === 'equalization-intake-form')).toBe(true);
    expect(nodes.filter((node) => node.tag === 'input' && node.attrs.required !== undefined)).toHaveLength(3);
    expect(nodes.some((node) => node.tag === 'button' && node.attrs.type === 'submit' && node.attrs.form === 'equalization-intake-form')).toBe(true);
    expect(text).not.toContain('Person auswählen …');
  });
});
