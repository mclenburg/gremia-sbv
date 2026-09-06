import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { OfficeHandoverExportPanel } from '../../../../src/app/features/case-handover/OfficeHandoverExportPanel';
import { LiveRegionProvider } from '../../../../src/app/shared/a11y/LiveRegionProvider';
import type { CaseRecord } from '../../../../src/domain/models/case.model';
import { descendants, renderElement, visibleText } from '../../../helpers/renderedMarkup';

const caseRecord: CaseRecord = {
  id: 'case-1',
  caseNumber: 'SBV-2026-1',
  displayName: 'Laufender Fall',
  category: 'sonstiges',
  status: 'offen',
  priority: 'normal',
  openedAt: '2026-09-01T08:00:00.000Z',
  isPseudonymized: true,
  isLocked: false,
};

describe('P2 – Amtsübergabe in der Oberfläche', () => {
  it('erklärt den Umfang, schließt das Journal aus und verlangt eine bewusste Bestätigung', () => {
    const rendered = renderElement(createElement(LiveRegionProvider, null,
      createElement(OfficeHandoverExportPanel, {
        cases: [caseRecord],
        inventory: {
          templateCount: 2,
          deadlineTemplateCount: 3,
          electionCount: 1,
          electionDocumentCount: 4,
          privacyReviewCount: 1,
          activityJournalIncluded: false,
        },
        onCompleted: async () => undefined,
      }),
    ));

    const text = visibleText(rendered.markup);
    expect(text).toContain('Amtsübergabe');
    expect(text).toContain('Tätigkeitsjournal');
    expect(text).toContain('nicht übergeben');
    expect(descendants(rendered.tree).some((node) => node.tag === 'input' && node.attrs.type === 'checkbox' && 'required' in node.attrs)).toBe(true);
  });
});
