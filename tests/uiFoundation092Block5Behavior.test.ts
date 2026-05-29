import React from 'react';
import { describe, expect, it } from 'vitest';
import { LiveRegionProvider } from '../src/app/shared/a11y/LiveRegionProvider';
import { ProcessSection } from '../src/app/shared/process/ProcessDetailHeader';
import { descendants, firstDescendant, renderElement, visibleText } from './helpers/renderedMarkup';

describe('UI-Fundament Block 5 Verhalten', () => {
  it('rendert Prozessabschnitte semantisch beschriftet und bei Bedarf fokussierbar', () => {
    const { tree, markup } = renderElement(
      React.createElement(ProcessSection, {
        title: 'Maßnahmenklärung',
        objective: 'Der Abschnitt wird bei Statuswechsel sichtbar.',
        announceOnMount: 'Abschnitt Maßnahmenklärung wurde eingeblendet.',
        focusOnMount: true,
        children: React.createElement(
          'p',
          null,
          'Maßnahmen brauchen Verantwortlichkeit und Wirksamkeitsprüfung.',
        ),
      }),
    );

    const section = firstDescendant(
      tree,
      (node) => node.tag === 'section' && node.attrs.class?.includes('process-detail-section'),
    );
    expect(section).toBeDefined();
    expect(section?.attrs.tabindex).toBe('-1');
    expect(section?.attrs['aria-labelledby']).toBeTruthy();

    const heading = descendants(tree).find((node) => node.tag === 'h3');
    expect(heading?.attrs.id).toBe(section?.attrs['aria-labelledby']);
    expect(visibleText(markup)).toContain('Maßnahmenklärung');
    expect(visibleText(markup)).toContain('Der Abschnitt wird bei Statuswechsel sichtbar.');
  });

  it('bleibt ohne LiveRegionProvider renderbar und nutzt mit Provider die zentrale Live-Region', () => {
    const standalone = renderElement(
      React.createElement(ProcessSection, {
        title: 'Reaktion des Arbeitgebers',
        announceOnMount: 'Abschnitt Reaktion wurde eingeblendet.',
        children: React.createElement('p', null, 'Arbeitgeberreaktion prüfen.'),
      }),
    );

    expect(visibleText(standalone.markup)).toContain('Reaktion des Arbeitgebers');

    const withProvider = renderElement(
      React.createElement(
        LiveRegionProvider,
        null,
        React.createElement(ProcessSection, {
          title: 'Abschluss',
          announceOnMount: 'Abschnitt Abschluss wurde eingeblendet.',
          children: React.createElement('p', null, 'Abschluss prüfen.'),
        }),
      ),
    );

    expect(withProvider.markup).toContain('class="industrial-live-region"');
    expect(visibleText(withProvider.markup)).toContain('Abschluss prüfen.');
  });
});
