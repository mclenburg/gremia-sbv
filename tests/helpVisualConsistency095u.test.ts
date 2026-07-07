import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IndustrialHelpButton } from '../src/app/shared/help/IndustrialHelp';
import { getHelpEntry } from '../src/app/shared/help/helpRegistry';
import { BemView } from '../src/app/features/bem/BemView';
import { PreventionView } from '../src/app/features/prevention/PreventionView';
import { LiveRegionProvider } from '../src/app/shared/a11y/LiveRegionProvider';

function textFrom(markup: string): string {
  return markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

describe('0.9.5-ab Hilfe-UI als Komponentenverhalten statt Source-String-Test', () => {
  it('rendert den zentralen Bereichs-Hilfebutton mit sichtbarem HILFE-Text', () => {
    const markup = renderToStaticMarkup(createElement(IndustrialHelpButton, { helpId: 'bem.overview', label: 'Bereichshilfe öffnen' }));

    expect(markup).toMatch(/<button[^>]*data-e2e="industrial-help-button"/);
    expect(markup).toMatch(/aria-label="Bereichshilfe öffnen"/);
    expect(markup).toMatch(/class="[^"]*industrial-help-button/);
    expect(markup).toContain('industrial-help-button-text');
    expect(textFrom(markup).toUpperCase()).toContain('HILFE');
  });

  it('rendert Feldhilfen kompakt ohne sichtbaren Zusatztext', () => {
    const markup = renderToStaticMarkup(createElement(IndustrialHelpButton, { helpId: 'bem.overview', label: 'Feldhilfe öffnen' }));

    expect(markup).toMatch(/aria-label="Feldhilfe öffnen"/);
    expect(markup).toContain('is-compact');
    expect(markup).not.toContain('industrial-help-button-text');
    expect(textFrom(markup).toUpperCase()).not.toContain('HILFE');
  });

  it('stellt die fachlichen Hilfeeinträge über die Registry bereit', () => {
    expect(getHelpEntry('bem.overview').title).toBe('BEM-Übersicht');
    expect(getHelpEntry('prevention.overview').title).toBe('Präventionsübersicht');
  });

  it('zeigt den zentralen Hilfezugang in BEM und Prävention beim Rendern der Oberfläche', () => {
    const onOpenCaseNode = () => undefined;
    const bemMarkup = renderToStaticMarkup(
      createElement(LiveRegionProvider, {
        children: createElement(BemView, { cases: [], onOpenCaseNode }),
      }),
    );
    const preventionMarkup = renderToStaticMarkup(
      createElement(LiveRegionProvider, {
        children: createElement(PreventionView, { cases: [], onOpenCaseNode }),
      }),
    );

    expect(textFrom(bemMarkup)).toContain('BEM-Verfahren');
    expect(bemMarkup).toContain('data-e2e="industrial-help-button"');
    expect(textFrom(preventionMarkup)).toContain('Präventionsverfahren');
    expect(preventionMarkup).toContain('data-e2e="industrial-help-button"');
  });
});
