import { describe, expect, it } from 'vitest';
import { workplaceFundingCreateValues, workplaceFundingUpdateValues } from '../../../services/workplaceAccommodationSupport';
import type { WorkplaceAccommodationRecord } from '../../../src/domain/models/workplace-accommodation.model';

const current: WorkplaceAccommodationRecord = {
  id: 'measure-1',
  caseId: 'case-1',
  title: 'Arbeitsplatz anpassen',
  status: 'entwurf',
  category: 'technische_arbeitshilfe',
  riskLevel: 'erhoeht',
  requestedAdjustment: 'Bildschirmarbeitsplatz',
  legalBasis: '§ 164 Abs. 4 SGB IX',
  technicalAidNeeded: true,
  organizationalAdjustmentNeeded: false,
  workingTimeAdjustmentNeeded: false,
  qualificationNeeded: false,
  fixedWorkplaceNeeded: false,
  homeofficeOrMobileWorkRelevant: false,
  inclusionOfficeInvolved: true,
  rehabCarrierInvolved: false,
  fundingCarrier: 'Inklusionsamt',
  fundingDocumentsStatus: 'vollständig',
  fundingAmount: 850,
  employerResponseStatus: 'offen',
  implementationStatus: 'nicht_begonnen',
  createdAt: '2026-08-16T08:00:00.000Z',
  updatedAt: '2026-08-16T08:00:00.000Z',
};

describe('Förderpfad Arbeitsplatzgestaltung', () => {
  it('preserves the complete funding snapshot when a measure is created', () => {
    expect(workplaceFundingCreateValues({
      caseId: 'case-1',
      title: 'Arbeitsplatz anpassen',
      fundingCarrier: ' Inklusionsamt ',
      fundingAppliedAt: '2026-08-15T10:30:00.000Z',
      fundingDocumentsStatus: ' vollständig ',
      fundingQuestions: 'Rückfrage zur Rechnung',
      fundingDecision: 'bewilligt',
      fundingAmount: 850,
      orderedAt: '2026-08-16T09:00:00.000Z',
    })).toEqual([
      'Inklusionsamt',
      '2026-08-15T10:30:00.000Z',
      'vollständig',
      'Rückfrage zur Rechnung',
      'bewilligt',
      850,
      '2026-08-16T09:00:00.000Z',
    ]);
  });

  it('keeps existing funding fields unless the user changes them explicitly', () => {
    expect(workplaceFundingUpdateValues({ fundingDecision: 'teilbewilligt', fundingAmount: 500 }, current)).toEqual([
      'Inklusionsamt',
      null,
      'vollständig',
      null,
      'teilbewilligt',
      500,
      null,
    ]);
  });
});
