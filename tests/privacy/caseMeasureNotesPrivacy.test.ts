import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MeasureNoteFields } from '../../src/app/features/cases/measures/MeasureNotesPanel';

describe('case measure note privacy behavior', () => {
  it('keeps inline command support on protocol and next-step note fields', () => {
    const markup = renderToStaticMarkup(
      React.createElement(MeasureNoteFields, {
        fieldPrefix: 'measure-note-test',
        form: { title: 'Terminnotiz', noteAt: '2026-05-12T10:30', participants: '', content: '', nextSteps: '' },
        onChange: () => undefined,
      }),
    );

    expect(markup.match(/data-text-command-enabled="true"/g)).toHaveLength(2);
    expect(markup).toContain('data-text-command-field="measure-note-test-content"');
    expect(markup).toContain('data-text-command-field="measure-note-test-next"');
  });
});
