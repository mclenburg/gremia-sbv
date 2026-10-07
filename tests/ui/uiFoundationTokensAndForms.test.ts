import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DangerButton, IndustrialButton, ToolbarButton } from '../../src/app/shared/components/IndustrialButton';
import { FormErrorSummary, SelectInput, TextInput, TextareaInput } from '../../src/app/shared/components/IndustrialForm';
import { descendants, renderComponent, renderElement, visibleText } from '../helpers/renderedMarkup';

describe('Zentrale Formulare und Aktionen', () => {
  it('verbindet Textfelder semantisch mit Label, Hilfe und Fehlermeldung und erhält den gespeicherten Wert', () => {
    const onValueChange = vi.fn();
    const { markup, tree } = renderComponent(TextInput, {
      label: 'Synthetische Eingabe', value: 'Gespeicherter Wert', helpText: 'Synthetischer Hinweis',
      error: 'Synthetischer Eingabefehler', required: true, onValueChange,
    });
    const nodes = descendants(tree);
    const input = nodes.find((node) => node.tag === 'input')!;
    expect(input.attrs.value).toBe('Gespeicherter Wert');
    expect(input.attrs.required).toBeDefined();
    expect(input.attrs['aria-invalid']).toBe('true');
    expect(nodes.filter((node) => node.tag === 'label' && node.attrs.for === input.attrs.id)).toHaveLength(1);
    const describedIds = input.attrs['aria-describedby'].split(' ');
    expect(describedIds).toHaveLength(2);
    for (const id of describedIds) expect(nodes.filter((node) => node.attrs.id === id)).toHaveLength(1);
    expect(visibleText(markup)).toContain('Synthetischer Hinweis');
    expect(visibleText(markup)).toContain('Synthetischer Eingabefehler');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('erhält mehrzeilige Texte ohne automatische Änderung und mit verbundenem Label', () => {
    const onValueChange = vi.fn();
    const { markup, tree } = renderComponent(TextareaInput, {
      label: 'Synthetische Notiz', value: 'Erste Zeile\nZweite Zeile', onValueChange,
    });
    const nodes = descendants(tree);
    const textarea = nodes.find((node) => node.tag === 'textarea')!;
    expect(nodes.filter((node) => node.tag === 'label' && node.attrs.for === textarea.attrs.id)).toHaveLength(1);
    expect(visibleText(markup)).toContain('Erste Zeile Zweite Zeile');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('stellt eine überschaubare Auswahl mit dem gespeicherten Wert und einem verbundenen Label bereit', () => {
    const onValueChange = vi.fn();
    const { tree } = renderComponent(SelectInput, {
      label: 'Synthetische Auswahl', value: 'second',
      options: [{ value: 'first', label: 'Erste Option' }, { value: 'second', label: 'Zweite Option' }],
      onValueChange,
    });
    const nodes = descendants(tree);
    const select = nodes.find((node) => node.tag === 'select')!;
    expect(nodes.filter((node) => node.tag === 'label' && node.attrs.for === select.attrs.id)).toHaveLength(1);
    const selected = nodes.find((node) => node.tag === 'option' && node.attrs.selected !== undefined);
    expect(selected?.attrs.value).toBe('second');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('bietet bei mehr als fünf Optionen eine benannte Suchauswahl an', () => {
    const { tree } = renderComponent(SelectInput, {
      label: 'Große Auswahl', value: 'option-2',
      options: Array.from({ length: 6 }, (_, index) => ({ value: `option-${index}`, label: `Option ${index}` })),
      onValueChange: () => undefined,
    });
    const nodes = descendants(tree);
    expect(nodes.filter((node) => node.tag === 'select')).toHaveLength(0);
    const combobox = nodes.find((node) => node.attrs.role === 'combobox')!;
    expect(combobox.attrs.value).toBe('Option 2');
    expect(combobox.attrs['aria-expanded']).toBe('false');
    expect(nodes.filter((node) => node.tag === 'label' && node.attrs.for === combobox.attrs.id)).toHaveLength(1);
  });

  it.each([
    ['Hauptaktion', IndustrialButton], ['Werkzeugaktion', ToolbarButton], ['Gefahrenaktion', DangerButton],
  ] as const)('verhindert bei laufender %s unbeabsichtigtes Absenden und weitere Aktivierung', (label, Button) => {
    const onClick = vi.fn();
    const { tree, markup } = renderElement(createElement(Button, { loading: true, onClick, children: label }));
    const button = descendants(tree).find((node) => node.tag === 'button')!;
    expect(button.attrs.type).toBe('button');
    expect(button.attrs.disabled).toBeDefined();
    expect(button.attrs['aria-busy']).toBe('true');
    expect(visibleText(markup)).toContain(label);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('meldet nur tatsächlich vorhandene Fehler als Alert und erhält wiederholte Fehler', () => {
    expect(renderComponent(FormErrorSummary, { errors: [null, false, undefined] }).markup).toBe('');
    const { tree, markup } = renderComponent(FormErrorSummary, { errors: ['Eingabe fehlt', null, 'Eingabe fehlt', 'Datum ungültig'] });
    const nodes = descendants(tree);
    expect(nodes.filter((node) => node.attrs.role === 'alert')).toHaveLength(1);
    expect(nodes.filter((node) => node.tag === 'li')).toHaveLength(3);
    expect(visibleText(markup)).toContain('Bitte Eingaben prüfen');
    expect(visibleText(markup)).toContain('Datum ungültig');
  });
});
