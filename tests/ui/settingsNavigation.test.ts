import { describe, expect, it } from 'vitest';
import { SettingsHub } from '../../src/app/features/settings/SettingsHub';
import { descendants, renderComponent, visibleText } from '../helpers/renderedMarkup';

describe('settings navigation', () => {
  it('zeigt zugängliche Einstellungsbereiche mit ausgewähltem Allgemein-Panel', () => {
    const { tree, markup } = renderComponent(SettingsHub, {
      theme: 'light',
      onThemeChange: () => undefined,
    });
    const nodes = descendants(tree);
    const tablist = nodes.find((node) => node.attrs.role === 'tablist');
    const tabs = nodes.filter((node) => node.attrs.role === 'tab');
    const panel = nodes.find((node) => node.attrs.role === 'tabpanel');

    expect(tablist?.attrs['aria-label']).toBe('Einstellungsbereiche');
    expect(tabs).toHaveLength(6);
    expect(tabs.filter((tab) => tab.attrs['aria-selected'] === 'true')).toHaveLength(1);
    expect(tabs[0]?.attrs['aria-controls']).toBe(panel?.attrs.id);
    expect(panel?.attrs['aria-labelledby']).toBe(tabs[0]?.attrs.id);
    expect(visibleText(markup)).toContain('Allgemein');
    expect(visibleText(markup)).toContain('Sicherheit');
    expect(visibleText(markup)).toContain('Datenschutz');
    expect(visibleText(markup)).toContain('Übergaben');
    expect(visibleText(markup)).toContain('Gremia.BR');
  });
});
