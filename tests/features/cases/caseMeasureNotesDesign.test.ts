import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MeasureNotesPanel } from '../../../src/app/features/cases/measures/MeasureNotesPanel';
import { LiveRegionProvider } from '../../../src/app/shared/a11y/LiveRegionProvider';

describe('case measure notes design integration', () => {
  it('renders as shared workbench subsection instead of isolated measure-note panel markup', () => {
    const markup = renderToStaticMarkup(
      React.createElement(LiveRegionProvider, null,
        React.createElement(MeasureNotesPanel, {
          caseId: 'case-1',
          measureType: 'participation',
          measureId: 'measure-1',
          measureTitle: 'SBV-Beteiligung prüfen',
        }),
      ),
    );

    expect(markup).toContain('class="industrial-subsection compact"');
    expect(markup).toContain('case-process-title-row');
    expect(markup).toContain('case-process-title-row-actions');
    expect(markup).toContain('class="industrial-secondary-button compact"');
    expect(markup).toContain('Maßnahmennotizen');
    expect(markup).toContain('Maßnahmennotizen-Hilfe öffnen');
    expect(markup).toContain('data-help-title="Maßnahmennotizen"');
    expect(markup).toContain('class="industrial-live-region"');
    expect(markup).toContain('Notizen werden direkt an');
    expect(markup).not.toContain('Termine und Verlauf direkt an');
    expect(markup).not.toContain('Maßnahmennotizen werden als sensible Falldaten gespeichert');
    expect(markup).not.toContain('measure-note-form');
    expect(markup).not.toContain('measure-note-card');
    expect(markup).not.toContain('measure-notes-header');
  });
});
