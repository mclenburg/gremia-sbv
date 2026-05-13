import { describe, expect, it } from 'vitest';
import { getCasePrivacyEntity, directCasePrivacyEntities, resolveAnonymizationValue } from '../services/privacyEntityRegistry';

describe('Privacy-/Retention-Registry 0.9.1', () => {
  it('führt Maßnahmennotizen als fallgebundene Datenschutzentität mit Marker- und Retention-Regeln', () => {
    const entity = getCasePrivacyEntity('case_measure_notes');

    expect(entity).toMatchObject({
      table: 'case_measure_notes',
      idColumn: 'id',
      caseColumn: 'case_id',
      deleteWithCase: true,
    });
    expect(entity?.pendingMarkerFields).toEqual(['title', 'participants', 'content', 'next_steps']);
    expect(entity?.anonymizeFields).toEqual({
      title: { literal: '[Maßnahmennotiz anonymisiert]' },
      participants: { literal: '[anonymisiert]' },
      content: 'anonymizationStamp',
      next_steps: 'null',
      contains_health_data: 'zero',
      confidential_level: { literal: 'normal' },
    });
  });

  it('stellt direkte Fallentitäten für Privacy Review und Retention bereit', () => {
    expect(directCasePrivacyEntities().map((entry) => entry.table)).toEqual(expect.arrayContaining([
      'cases',
      'case_notes',
      'case_documents',
      'case_measure_notes',
      'case_measures',
    ]));
    expect(resolveAnonymizationValue('anonymizationStamp', 'Anonymisiert am 13.05.2026')).toBe('Anonymisiert am 13.05.2026');
    expect(resolveAnonymizationValue('null', 'unused')).toBeNull();
    expect(resolveAnonymizationValue('zero', 'unused')).toBe(0);
    expect(resolveAnonymizationValue({ literal: 'normal' }, 'unused')).toBe('normal');
  });
});
