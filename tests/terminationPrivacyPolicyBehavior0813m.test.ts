import { describe, expect, it } from 'vitest';
import type { TerminationHearingRecord } from '../src/app/core/models/termination.model';
import { buildTerminationExportContext, TERMINATION_PRIVACY_FIELD_CLASSIFICATIONS, terminationPrivacyExportNotice } from '../services/terminationPrivacyPolicy';

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
  it('classifies termination export fields as confidential or critical', () => {
    const employerReason = TERMINATION_PRIVACY_FIELD_CLASSIFICATIONS.find((entry) => entry.field === 'employerReason');
    const protectionStatus = TERMINATION_PRIVACY_FIELD_CLASSIFICATIONS.find((entry) => entry.field === 'protectionStatus');

    expect(employerReason?.risk).toBe('critical');
    expect(employerReason?.exportRelevant).toBe(true);
    expect(protectionStatus?.risk).toBe('highly_confidential');
    expect(TERMINATION_PRIVACY_FIELD_CLASSIFICATIONS.every((entry) => entry.reason.length > 20)).toBe(true);
  });

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
