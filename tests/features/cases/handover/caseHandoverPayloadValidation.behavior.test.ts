import { describe, expect, it } from 'vitest';
import { assertCaseHandoverPayload } from '../../../../services/caseHandoverPayloadValidator';
import { CASE_HANDOVER_FORMAT, CASE_HANDOVER_VERSION } from '../../../../services/caseHandoverPolicy';
import type { PackagePayload } from '../../../../services/caseHandoverSupport';

function validOfficePayload(): PackagePayload {
  return {
    format: CASE_HANDOVER_FORMAT,
    version: CASE_HANDOVER_VERSION,
    packageId: 'handover_validation',
    createdAt: '2026-09-05T12:00:00.000Z',
    purpose: 'Amtsübergabe',
    packageType: 'office_handover',
    cases: [{ ref: 'case_1', data: { id: 'case-source-1', case_id: 'case-source-1', measure_id: '', protected_person_id: null } }],
    protectedPersons: [], notes: [], measures: [], measureNotes: [], deadlines: [], documents: [],
    officeData: {
      documentTemplates: [], deadlineTemplates: [], retentionSettings: { moduleRules: {} },
      privacyReviews: [], elections: [], electionDocuments: [], activityJournalIncluded: false,
    },
  };
}

describe('Übergabepaket-Validierung', () => {
  it('akzeptiert einen vollständigen minimalen Amtsbestand ohne Journal', () => {
    const payload = validOfficePayload();
    expect(assertCaseHandoverPayload(payload, CASE_HANDOVER_VERSION).officeData?.activityJournalIncluded).toBe(false);
  });

  it('weist Pakete mit persönlichem Tätigkeitsjournal zurück', () => {
    const payload = validOfficePayload();
    (payload.officeData as unknown as { activityJournalIncluded: boolean }).activityJournalIncluded = true;
    expect(() => assertCaseHandoverPayload(payload, CASE_HANDOVER_VERSION)).toThrow();
  });

  it('weist nicht kanonische Dokumentdaten vor dem Import zurück', () => {
    const payload = validOfficePayload();
    payload.documents.push({
      ref: 'document_1', caseRef: 'case_1', data: { id: 'document-source-1', case_id: 'case-source-1', measure_id: '', protected_person_id: null }, contentBase64: 'nicht-base64',
    });
    expect(() => assertCaseHandoverPayload(payload, CASE_HANDOVER_VERSION)).toThrow();
  });
});
