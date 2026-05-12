import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MeasureNotesPanel } from '../src/app/features/cases/measures/MeasureNotesPanel';

describe('case measure notes design integration', () => {
  it('renders as shared workbench subsection instead of isolated measure-note panel markup', () => {
    const markup = renderToStaticMarkup(
      React.createElement(MeasureNotesPanel, {
        caseId: 'case-1',
        measureType: 'participation',
        measureId: 'measure-1',
        measureTitle: 'SBV-Beteiligung prüfen',
      }),
    );

    expect(markup).toContain('class="industrial-subsection compact"');
    expect(markup).toContain('class="case-process-title-row"');
    expect(markup).toContain('class="industrial-secondary-button"');
    expect(markup).toContain('Maßnahmennotizen');
    expect(markup).toContain('Termine und Verlauf direkt an');
    expect(markup).not.toContain('measure-note-form');
    expect(markup).not.toContain('measure-note-card');
    expect(markup).not.toContain('measure-notes-header');
  });
});
