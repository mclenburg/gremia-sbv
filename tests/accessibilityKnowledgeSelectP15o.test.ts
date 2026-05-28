import { describe, expect, it } from 'vitest';
import { KnowledgeDetailPanel, KnowledgeSearchPanel } from '../src/app/features/knowledge/KnowledgePanels';
import { descendants, renderComponent } from './helpers/renderedMarkup';
import type { CaseRecord } from '../src/app/core/models/case.model';
import type { LegalNormRecord } from '../src/app/core/models/knowledge.model';

function selectByAccessibleName(markup: string, expectedName: string) {
  const { tree } = renderComponent(KnowledgeSearchPanel, {
    query: 'Prävention',
    source: 'SGB IX',
    sources: ['SGB IX'],
    onQueryChange: () => undefined,
    onSourceChange: () => undefined,
    onSubmit: () => undefined,
  });
  return descendants(tree).find((node) => node.tag === 'select' && node.attrs['aria-label'] === expectedName && markup.includes(expectedName));
}

const selectedNorm: LegalNormRecord = {
  id: 'norm-178',
  paragraph: '§ 178 SGB IX',
  title: 'Aufgaben der Schwerbehindertenvertretung',
  source: 'SGB IX',
  shortText: 'SBV-Beteiligung',
  sbvMeaning: 'Beteiligungsrecht',
  practiceNote: 'frühzeitig prüfen',
  typicalCases: 'Anhörung',
  tags: ['SBV'],
  createdAt: '2026-05-01T08:00:00.000Z',
  updatedAt: '2026-05-01T08:00:00.000Z',
};

const caseRecord: CaseRecord = {
  id: 'case-1',
  caseNumber: 'SBV-2026-001',
  displayName: 'Demo-Fall',
  category: 'praevention',
  status: 'offen',
  priority: 'normal',
  openedAt: '2026-05-01T08:00:00.000Z',
  isPseudonymized: false,
  isLocked: false,
};

describe('P15o knowledge accessibility select names', () => {
  it('gives the knowledge source filter an accessible name in rendered markup', () => {
    const rendered = renderComponent(KnowledgeSearchPanel, {
      query: 'Prävention',
      source: 'SGB IX',
      sources: ['SGB IX'],
      onQueryChange: () => undefined,
      onSourceChange: () => undefined,
      onSubmit: () => undefined,
    });

    const select = selectByAccessibleName(rendered.markup, 'Quelle der Wissenssuche');
    expect(select?.attrs.class).toContain('industrial-select');
    expect(select?.children.some((option) => option.tag === 'option' && option.attrs.value === 'SGB IX' && 'selected' in option.attrs)).toBe(true);
  });

  it('gives the case-link select an accessible name in rendered markup', () => {
    const { tree } = renderComponent(KnowledgeDetailPanel, {
      selectedNorm,
      cases: [caseRecord],
      linkCaseId: 'case-1',
      caseReferences: [],
      checklist: [],
      comments: [],
      caseLaw: [],
      checklistText: '',
      commentTitle: '',
      commentText: '',
      caseLawCourt: '',
      caseLawFileNumber: '',
      caseLawHolding: '',
      onLinkCaseIdChange: () => undefined,
      onLinkSelectedNormToCase: () => undefined,
      onChecklistTextChange: () => undefined,
      onCommentTitleChange: () => undefined,
      onCommentTextChange: () => undefined,
      onCaseLawCourtChange: () => undefined,
      onCaseLawFileNumberChange: () => undefined,
      onCaseLawHoldingChange: () => undefined,
      onCreateChecklistItem: () => undefined,
      onCreateComment: () => undefined,
      onCreateCaseLaw: () => undefined,
    });

    const select = descendants(tree).find((node) => node.tag === 'select' && node.attrs['aria-label'] === 'Fallakte für Rechtsbezug auswählen');
    expect(select?.attrs.class).toContain('industrial-select');
    expect(select?.children.some((option) => option.tag === 'option' && option.attrs.value === 'case-1' && 'selected' in option.attrs)).toBe(true);
  });
});
