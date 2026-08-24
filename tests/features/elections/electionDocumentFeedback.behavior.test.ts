import { describe, expect, it } from 'vitest';
import { electionDocumentFeedback } from '../../../src/app/features/elections/electionDocumentFeedback';

describe('Rückmeldung zur Wahl-PDF-Vorschau', () => {
  it('meldet den erteilten Öffnungsauftrag als Erfolg', () => {
    expect(electionDocumentFeedback({
      document: { filename: 'wahlausschreiben.pdf' },
      previewStatus: 'requested',
    })).toMatchObject({ tone: 'success' });
  });

  it('zeigt eine konkrete Warnung, wenn nur die verschlüsselte Speicherung gelang', () => {
    expect(electionDocumentFeedback({
      document: { filename: 'wahlausschreiben.pdf' },
      previewStatus: 'unavailable',
      previewMessage: 'PDF gespeichert; temporäre Vorschau nicht möglich.',
    })).toEqual({
      tone: 'warning',
      message: 'PDF gespeichert; temporäre Vorschau nicht möglich.',
    });
  });
});
