import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ModuleFeedback } from '../../src/app/shared/components/ModuleFeedback';
import { ProcessOverviewPage } from '../../src/app/shared/process/ProcessOverview';
import { descendants, renderElement, visibleText } from '../helpers/renderedMarkup';

describe('Modulrückmeldungen', () => {
  it('kündigt Hinweise höflich und Warnungen dringlich an', () => {
    for (const scenario of [
      { tone: 'info' as const, role: 'status', live: 'polite' },
      { tone: 'warning' as const, role: 'alert', live: 'assertive' },
    ]) {
      const message = 'Der Vorgang benötigt eine Prüfung.';
      const { tree, markup } = renderElement(createElement(ModuleFeedback, {
        items: [null, { tone: scenario.tone, message }, false],
      }));
      const region = descendants(tree).find((node) => node.attrs.role === scenario.role);

      expect(region?.attrs['aria-live']).toBe(scenario.live);
      expect(visibleText(markup)).toContain(message);
      expect(descendants(tree).some((node) => node.tag === 'button' && node.attrs['aria-label'] === 'Meldung schließen')).toBe(true);
    }
  });

  it('zeigt eine Rückmeldung in der Prozessübersicht an', () => {
    const message = 'Speichern fehlgeschlagen; bitte erneut versuchen.';
    const { tree, markup } = renderElement(createElement(ProcessOverviewPage, {
      title: 'Vorgänge',
      kicker: 'Übersicht',
      description: 'Aktuelle Vorgänge',
      stats: [],
      groups: [],
      renderItem: () => null,
      emptyText: 'Keine Vorgänge',
      feedbackItems: [{ tone: 'warning', message }],
    }));

    expect(visibleText(markup)).toContain(message);
    expect(descendants(tree).some((node) => node.attrs.role === 'alert' && node.attrs['aria-live'] === 'assertive')).toBe(true);
  });
});
