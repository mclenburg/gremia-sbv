import { describe, expect, it } from 'vitest';
import { PersonLifecycleReviewDialog } from '../../src/app/features/persons/PersonLifecycleReviewDialog';
import type { PrivacyReviewItemRecord } from '../../src/domain/models/privacy-review.model';
import type { ProtectedPersonRecord } from '../../src/domain/models/protected-person.model';
import { descendants, renderComponent, visibleText } from '../helpers/renderedMarkup';

const person: ProtectedPersonRecord = {
  id: 'person-1',
  createdAt: '2026-05-01T08:00:00.000Z',
  updatedAt: '2026-05-01T08:00:00.000Z',
  firstName: 'Ada',
  lastName: 'Lovelace',
  employmentState: 'active_employee',
  protectionStatus: 'expired',
  statusSource: 'manual',
  lifecycleState: 'expired_review_required',
};

const review: PrivacyReviewItemRecord = {
  id: 'review-1',
  caseId: 'case-1',
  protectedPersonId: 'person-1',
  reason: 'status_expired',
  priority: 'high',
  dueAt: '2026-05-02T08:00:00.000Z',
  freeTextReviewRequired: true,
  context: {
    openDeadlineCount: 1,
    runningMeasureCount: 1,
    linkedDocumentCount: 0,
    freeTextReviewRequired: true,
    caseFile: {
      id: 'case-1',
      caseNumber: 'SBV-2026-001',
      displayName: 'Demo-Fall',
      category: 'gdb',
      status: 'offen',
      priority: 'normal',
      openedAt: '2026-05-01T08:00:00.000Z',
      isPseudonymized: false,
      isLocked: false,
    },
  },
  status: 'open',
  createdAt: '2026-05-01T08:00:00.000Z',
  updatedAt: '2026-05-01T08:00:00.000Z',
};

describe('Privacy Review Tooltip UX 0.9.1', () => {
  it('rendert Inline-Anonymisierung über das zentrale Hilfesystem statt als langen UI-Hinweis', () => {
    const { markup, tree } = renderComponent(PersonLifecycleReviewDialog, {
      person,
      open: true,
      reviews: [review],
      loading: false,
      onOpen: async () => undefined,
      onClose: () => undefined,
      onDocumentRetention: async () => ({ ok: true }),
      onScheduleLater: async () => ({ ok: true }),
      onClear: async () => ({ ok: true }),
      onAnonymizeCase: async () => ({ ok: true }),
      onDeleteCase: async () => ({ ok: true }),
      onMessage: () => undefined,
      onError: () => undefined,
    });

    const helpButtons = descendants(tree).filter((node) => node.attrs.class?.includes('industrial-help-button'));
    expect(helpButtons.length).toBeGreaterThanOrEqual(2);
    expect(helpButtons.every((node) => node.attrs['aria-haspopup'] === 'dialog')).toBe(true);
    expect(helpButtons.every((node) => node.attrs['aria-label'] === 'Hilfe zur Anonymisierung vormerkter Freitexte öffnen')).toBe(true);
    expect(helpButtons[0].attrs['data-help-title']).toBe('Vorgemerkte Freitexte anonymisieren');
    expect(visibleText(markup)).not.toContain('Freitexte werden nicht blind anonymisiert');
    expect(visibleText(markup)).not.toContain('indem auf ~~ der zu anonymisierende Inhalt folgt');
  });
});
