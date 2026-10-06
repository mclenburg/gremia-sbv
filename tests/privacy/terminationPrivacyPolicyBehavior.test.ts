import { describe, expect, it } from 'vitest';
import type { TerminationHearingRecord } from '../../src/domain/models/termination.model';
import { buildTerminationExportContext, terminationPrivacyExportNotice } from '../../services/terminationPrivacyPolicy';

const hearing: TerminationHearingRecord = {
  id: 'term-1',
  caseId: 'case-1',
  status: 'stellungnahme_in_arbeit',
  terminationType: 'ausserordentlich',
  protectionStatus: 'schwerbehindert',
  integrationOfficeDecision: 'beantragt',
  employerReason: 'behaupteter Pflichtverstoß',
  missingInformation: 'Beteiligungsunterlagen fehlen',
  sbvAssessment: 'Unterrichtung unvollständig',
  statement: 'SBV nimmt Stellung',
  createdAt: '2026-05-07T08:00:00.000Z',
  updatedAt: '2026-05-07T08:00:00.000Z'
};

describe('termination privacy policy behavior', () => {
  it('builds an export context from defined fields and preserves empty optional fields safely', () => {
    const context = buildTerminationExportContext(hearing);

    expect(context).toContain('Schutzstatus: schwerbehindert');
    expect(context).toContain('Kündigungsart: ausserordentlich');
    expect(context).toContain('Arbeitgebervortrag: behaupteter Pflichtverstoß');
    expect(context).toContain('SBV-Stellungnahme: SBV nimmt Stellung');

    const minimal = buildTerminationExportContext({ ...hearing, integrationOfficeDecision: undefined, statement: undefined });
    expect(minimal).toContain('Integrationsamt: ');
    expect(minimal).toContain('SBV-Stellungnahme: ');
  });

  it('states a clear export privacy warning', () => {
    expect(terminationPrivacyExportNotice()).toContain('besonders schutzbedürftige Beschäftigtendaten');
    expect(terminationPrivacyExportNotice()).toContain('dokumentiertem Zweck');
  });
});
