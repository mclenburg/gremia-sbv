import { describe, expect, it } from 'vitest';
import {
  assertNoConversationProtocolField,
  defaultApplicantReference,
  normalizeAccessibilityCheckStatus,
  normalizeApplicantReferenceMode,
  normalizeApplicantStatus,
  normalizeBoolean,
  normalizeNonNegativeInteger,
  normalizeOptionalBoolean,
  normalizeOptionalIso,
  normalizeOptionalText,
  normalizeRecruitingParticipationStatus,
  normalizeRequiredIso,
  normalizeViolationReviewReason,
} from '../services/recruitingParticipationValidation';

describe('Recruiting-Validierung – ausführbares Verhalten', () => {
  it('normalisiert gültige optionale Texte und verwirft leere oder typfremde Werte', () => {
    expect(normalizeOptionalText('  Vorgang 17  ')).toBe('Vorgang 17');
    expect(normalizeOptionalText('   ')).toBeNull();
    expect(normalizeOptionalText(17)).toBeNull();
  });

  it('normalisiert Datumswerte deterministisch und lehnt ungültige Werte ab', () => {
    expect(normalizeOptionalIso('2026-08-05')).toBe('2026-08-05T00:00:00.000Z');
    expect(normalizeRequiredIso('2026-08-05T12:30:00+02:00', 'Anhörungsdatum')).toBe('2026-08-05T10:30:00.000Z');
    expect(normalizeOptionalIso('')).toBeNull();
    expect(() => normalizeOptionalIso('kein-datum')).toThrow(/Ungültiges Datum/);
    expect(() => normalizeRequiredIso('', 'Anhörungsdatum')).toThrow(/Anhörungsdatum ist erforderlich/);
  });

  it('übernimmt nur veröffentlichte Statuswerte und nutzt sichere Defaults', () => {
    expect(normalizeRecruitingParticipationStatus('hearing_pending')).toBe('hearing_pending');
    expect(normalizeRecruitingParticipationStatus('erfunden')).toBe('draft');
    expect(normalizeApplicantReferenceMode('clear_name')).toBe('clear_name');
    expect(normalizeApplicantReferenceMode('named_reference')).toBe('anonymous_reference');
    expect(normalizeApplicantReferenceMode(null)).toBe('anonymous_reference');
    expect(normalizeApplicantStatus('severely_disabled')).toBe('severely_disabled');
    expect(normalizeApplicantStatus('unknown')).toBe('unknown_or_not_relevant');
    expect(normalizeAccessibilityCheckStatus('contact_offered')).toBe('contact_offered');
    expect(normalizeAccessibilityCheckStatus(false)).toBe('not_checked');
    expect(normalizeViolationReviewReason('missing_hearing_after_interview')).toBe('missing_hearing_after_interview');
    expect(normalizeViolationReviewReason('sonstiges')).toBeNull();
  });

  it('normalisiert boolesche und nichtnegative Anzahlwerte einschließlich Grenzfällen', () => {
    expect(normalizeBoolean(1)).toBe(true);
    expect(normalizeBoolean(0)).toBe(false);
    expect(normalizeOptionalBoolean('')).toBeNull();
    expect(normalizeOptionalBoolean(undefined)).toBeNull();
    expect(normalizeOptionalBoolean('false')).toBe(true);
    expect(normalizeNonNegativeInteger('4.9')).toBe(4);
    expect(normalizeNonNegativeInteger(0)).toBe(0);
    expect(normalizeNonNegativeInteger('')).toBeNull();
    expect(() => normalizeNonNegativeInteger(-1)).toThrow(/nicht negativ/);
    expect(() => normalizeNonNegativeInteger(Number.POSITIVE_INFINITY)).toThrow(/nicht negativ/);
  });

  it('erzeugt stabile Bewerbungsreferenzen und verbietet Gesprächsprotokollfelder', () => {
    expect(defaultApplicantReference(3)).toBe('Bewerbung 3');
    expect(defaultApplicantReference(0)).toBe('Bewerbung 1');
    expect(() => assertNoConversationProtocolField('conversationTranscript')).toThrow(/kein zulässiges Feld/);
  });
});
