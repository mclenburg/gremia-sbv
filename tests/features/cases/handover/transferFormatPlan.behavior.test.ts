import { describe, expect, it } from 'vitest';
import { planVacationHandoverFormat } from '../../../../src/domain/transfer/transferFormatPlan';
import type { TransferCapabilities } from '../../../../src/domain/models/transfer-capability.model';

const capability: TransferCapabilities = {
  protocolVersion: 1, readFormats: [1, 2, 3, 4], writeFormats: [2, 4],
  features: ['manual_capability_exchange'], buildVersion: '0.9.8', revision: 1, issuedAt: '2026-11-11T10:00:00.000Z',
};

describe('Urlaubsübergabe-Formatplan', () => {
  it('schlägt aus verifizierten Leseformaten das neueste tatsächlich schreibbare Format vor', () => {
    expect(planVacationHandoverFormat(capability)).toEqual({ suggested: 4, available: [4, 2], verified: true });
    expect(planVacationHandoverFormat({ ...capability, readFormats: [1, 2], buildVersion: '9.9.9' }))
      .toEqual({ suggested: 2, available: [2], verified: true });
  });

  it('erfindet bei unbekannter Fähigkeit keinen bestätigten Funktionsstand', () => {
    expect(planVacationHandoverFormat(null)).toEqual({ suggested: 4, available: [4, 2], verified: false });
  });

  it('sperrt Gegenstellen ohne gemeinsames Format unabhängig vom Versionsstring', () => {
    expect(planVacationHandoverFormat({ ...capability, readFormats: [1, 3], buildVersion: '99.0.0' }))
      .toEqual({ suggested: null, available: [], verified: true });
  });
});
