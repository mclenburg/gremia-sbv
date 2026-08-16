import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CaseRegister } from '../../src/app/features/cases/CaseRegister';
import { PersonList } from '../../src/app/features/persons/PersonList';
import { CaseNoteModal } from '../../src/app/features/cases/CaseNoteModal';
import { MeasureNoteFields } from '../../src/app/features/cases/measures/MeasureNoteForm';
import { LiveRegionProvider } from '../../src/app/shared/a11y/LiveRegionProvider';
import { readNormalizedSourceText } from '../helpers/sourceText';

const noop = () => undefined;

describe('review 5 user guidance polish', () => {
  it('renders empty case registers with shared EmptyState and a first-case action', () => {
    const markup = renderToStaticMarkup(
      React.createElement(CaseRegister, {
        filteredCount: 0,
        visibleCases: [],
        selectedCaseId: '',
        caseFilter: '',
        onCaseFilterChange: noop,
        onSelectCase: noop,
        onCreateCase: noop,
        page: 1,
        pageCount: 1,
        pageSize: 25,
        onPageChange: noop,
      }),
    );

    expect(markup).toContain('class="industrial-empty-state"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('Noch keine Fallakte');
    expect(markup).toContain('Ersten Fall anlegen');
    expect(markup).not.toContain('class="industrial-empty">Keine passenden Fälle.</div>');
  });

  it('renders empty person lists with shared EmptyState and explicit create/import actions', () => {
    const markup = renderToStaticMarkup(
      React.createElement(PersonList, {
        persons: [],
        selectedId: undefined,
        onSelect: noop,
        onEdit: noop,
        onDelete: noop,
        onCreatePerson: noop,
        onImportPersons: noop,
      }),
    );

    expect(markup).toContain('class="industrial-empty-state"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('Noch keine Personen im Verzeichnis');
    expect(markup).toContain('Erste Person erfassen');
    expect(markup).toContain('Personen importieren');
    expect(markup).not.toContain('Keine Personen gefunden.');
  });

  it('places privacy guidance at rendered protocol and measure-note text entry points', () => {
    const caseNoteMarkup = renderToStaticMarkup(
      React.createElement(LiveRegionProvider, {
        children: React.createElement(CaseNoteModal, {
          open: true,
          editingNote: null,
          noteTitle: '',
          noteDate: '2026-08-16T12:00',
          noteType: 'gespraech',
          participants: '',
          content: '',
          nextSteps: '',
          cases: [],
          linkedCaseIds: [],
          selectedCaseId: '',
          confidentialLevel: 'normal',
          containsHealthData: false,
          noteError: '',
          noteInfo: '',
          pendingInlineActions: [],
          onRemovePendingInlineAction: noop,
          onTitleChange: noop,
          onDateChange: noop,
          onNoteTypeChange: noop,
          onParticipantsChange: noop,
          onProtocolTextChange: noop,
          onProtocolTextCommand: noop,
          onToggleLinkedCase: noop,
          onConfidentialLevelChange: noop,
          onContainsHealthDataChange: noop,
          onCancel: noop,
          onSubmit: noop,
        }),
      }),
    );
    const measureMarkup = renderToStaticMarkup(
      React.createElement(MeasureNoteFields, {
        fieldPrefix: 'review-guidance',
        form: { title: '', noteAt: '2026-08-16T12:00', participants: '', content: '', nextSteps: '' },
        onChange: noop,
      }),
    );

    expect(caseNoteMarkup).toContain('Datensparsam protokollieren');
    expect(caseNoteMarkup).toContain('keine Diagnosen, keine unnötigen Gesundheitsdetails');
    expect(measureMarkup).toContain('Datensparsam dokumentieren');
    expect(measureMarkup).toContain('Nächsten sauberen Schritt konkret erfassen');
  });

  it('links Betriebsgrenzen from the user-facing README', () => {
    const readme = readNormalizedSourceText('README.md');

    expect(readme).toContain('Fachliche Grenzen und Betriebsvoraussetzungen');
    expect(readme).toContain('docs/BETRIEBSGRENZEN.md');
  });
});
