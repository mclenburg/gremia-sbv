import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { listComplianceDocuments, renderComplianceDocument } from '../../services/complianceCenterService';
import { CasePrivacyActionDialog } from '../../src/app/features/cases/CasePrivacyActionDialog';
import { PersonPrivacyActionDialog } from '../../src/app/features/persons/PersonPrivacyActionDialog';
import type { CaseRecord } from '../../src/domain/models/case.model';
import type { ProtectedPersonRecord } from '../../src/domain/models/protected-person.model';

describe('DSB-Transparenzpatch 0.9.2', () => {
  it('stellt eine Art.-13/14-Datenschutzinformation als Compliance-Dokument bereit', () => {
    const descriptors = listComplianceDocuments();
    expect(descriptors.some((item) => item.type === 'data_protection_notice')).toBe(true);

    const notice = renderComplianceDocument('data_protection_notice');
    expect(notice.title).toContain('Art. 13/14 DSGVO');
    expect(notice.body).toContain('Art. 13 DSGVO');
    expect(notice.body).toContain('Art. 14 DSGVO');
    expect(notice.body).toContain('§ 178 Abs. 1 SGB IX');
    expect(notice.body).toContain('§ 178 Abs. 2 Satz 1 SGB IX');
    expect(notice.body).toContain('muss vor Verwendung organisatorisch, fachlich und datenschutzrechtlich geprüft und freigegeben werden');
    expect(notice.body).toContain('Gremia.SBV versendet diese Information nicht automatisch');
  });

  it('zeigt den Audit-Hinweis in geöffneten Fall- und Personendialogen', () => {
    const record: CaseRecord = {
      id: 'case-1', caseNumber: '2026-001', displayName: 'Test', category: 'bem', status: 'offen',
      priority: 'normal', openedAt: '2026-08-11T00:00:00.000Z', isPseudonymized: false,
      isLocked: false, personBindingState: 'legacy_unlinked', privacyReviewRequired: false,
      privacyReviewPriority: 'normal', anonymizationRecommended: false,
    };
    const person: ProtectedPersonRecord = {
      id: 'person-1', createdAt: '2026-08-11T00:00:00.000Z', updatedAt: '2026-08-11T00:00:00.000Z',
      firstName: 'Ada', lastName: 'Lovelace', employmentState: 'active_employee',
      protectionStatus: 'severely_disabled', statusSource: 'manual', lifecycleState: 'active',
    };
    const caseMarkup = renderToStaticMarkup(createElement(CasePrivacyActionDialog, {
      open: true, record, onClose: () => undefined, onSubmit: async () => undefined,
    }));
    const personMarkup = renderToStaticMarkup(createElement(PersonPrivacyActionDialog, {
      open: true, mode: 'delete', person, affectedCaseCount: 1,
      onClose: () => undefined, onSubmit: async () => undefined, onError: () => undefined,
    }));

    for (const markup of [caseMarkup, personMarkup]) {
      expect(markup).toContain('data-e2e="audit-log-retention-notice"');
      expect(markup).toContain('Sicherheitseinträge im Audit-Log bleiben aus Integritätsgründen erhalten');
      expect(markup).toContain('keine Direktidentifikatoren');
    }
  });
});
