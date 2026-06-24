import { describe, expect, it } from 'vitest';
import type { SbvParticipationViolationRecord, SbvParticipationViolationTemplateInput } from '../src/app/core/models/sbv-participation-violation.model';
import { SbvParticipationViolationTemplateService } from '../services/sbvParticipationViolationTemplateService';

function validTemplateInput(patch: Partial<SbvParticipationViolationTemplateInput> = {}): SbvParticipationViolationTemplateInput {
  return {
    stage: 'formal_objection',
    subject: 'SBV-Beteiligung nachholen',
    recipientLabel: 'Arbeitgeber',
    sourceReference: 'Fall SBV-2026-004',
    measureDescription: 'Eine Maßnahme mit möglichem Bezug zu schwerbehinderten Beschäftigten wurde vorbereitet.',
    wrongBehavior: 'Die SBV wurde nicht vor der Entscheidung angehört.',
    requiredBehavior: 'Die SBV ist unverzüglich und umfassend zu unterrichten und vor einer Entscheidung anzuhören.',
    includeOwiHint: false,
    includeLegalReviewHint: false,
    privacyMode: 'case_reference',
    ...patch,
  };
}

function violationRecord(patch: Partial<SbvParticipationViolationRecord> = {}): SbvParticipationViolationRecord {
  return {
    id: 'violation-1',
    stage: 'abmahnung',
    status: 'sent',
    violationType: 'repeated_violation',
    sourceContextType: 'case',
    sourceContextId: 'case-1',
    caseId: 'SBV-2026-004',
    subject: 'Wiederholte Nichtbeteiligung',
    measureDescription: 'Der Arbeitgeber setzte eine Maßnahme mit SBV-Bezug fort.',
    wrongBehavior: 'Die SBV wurde wiederholt nicht vor der Entscheidung angehört.',
    requiredBehavior: 'Die SBV ist vor Entscheidungen nach § 178 Abs. 2 Satz 1 SGB IX zu beteiligen.',
    consequenceWarning: 'Bei Wiederholung werden weitere rechtliche Schritte geprüft.',
    legalBasis: '§ 178 Abs. 2 SGB IX; § 238 Abs. 1 Nr. 8 SGB IX',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    ...patch,
  };
}

describe('Beteiligungsverstoß-Template-Verhalten 0.9.4-c-r9', () => {
  it('validiert Eskalationsstufen nach fachlichem Branch-Verhalten statt nach Quelltext-Strings', () => {
    const service = new SbvParticipationViolationTemplateService();

    expect(service.validate(validTemplateInput({ stage: 'request' })).valid).toBe(true);

    const abmahnung = service.validate(validTemplateInput({ stage: 'abmahnung', consequenceWarning: undefined }));
    expect(abmahnung.valid).toBe(false);
    expect(abmahnung.missingFields).toContain('Konsequenzwarnung');

    const suspension = service.validate(validTemplateInput({ stage: 'suspension_request', followUpDueAt: undefined }));
    expect(suspension.valid).toBe(false);
    expect(suspension.missingFields).toContain('Wiedervorlage / Nachholfrist');
  });

  it('erzeugt Warnungen für scharfe Stufen, OWi-Hinweis und personalisierten Datenschutzmodus getrennt', () => {
    const service = new SbvParticipationViolationTemplateService();

    expect(service.validate(validTemplateInput({
      stage: 'abmahnung',
      consequenceWarning: 'Bei Wiederholung werden rechtliche Schritte geprüft.',
      includeLegalReviewHint: false,
    })).warnings).toContain('Scharfe Eskalationsstufen sollten anwaltlich geprüft werden.');

    expect(service.validate(validTemplateInput({
      stage: 'owi_preparation',
      includeOwiHint: false,
      includeLegalReviewHint: true,
    })).warnings).toContain('OWi-Hinweis ist für diese Stufe fachlich vorgesehen.');

    expect(service.validate(validTemplateInput({
      privacyMode: 'personalized',
    })).warnings.join('\n')).toMatch(/Datenschutz/);
  });

  it('prefillt Dokumenteingaben aus dem Verstoßvorgang mit Fallreferenz und scharfer-Stufe-Hinweis', () => {
    const service = new SbvParticipationViolationTemplateService();
    const input = service.buildInputFromViolation(violationRecord());

    expect(input).toMatchObject({
      stage: 'abmahnung',
      sourceReference: 'Fallbezug SBV-2026-004',
      includeLegalReviewHint: true,
      includeOwiHint: false,
      privacyMode: 'case_reference',
    });
    expect(service.validate(input).valid).toBe(true);
  });

  it('erzwingt valide Eingaben vor Texterzeugung und erzeugt keinen Versand-Automatismus', () => {
    const service = new SbvParticipationViolationTemplateService();

    expect(() => service.buildPlainText(validTemplateInput({
      stage: 'abmahnung',
      consequenceWarning: undefined,
    }))).toThrow(/Pflichtangaben fehlen/);

    const plain = service.buildPlainText(validTemplateInput({
      stage: 'suspension_request',
      followUpDueAt: '2026-07-01T00:00:00.000Z',
      includeLegalReviewHint: true,
    }));
    expect(plain).toMatch(/Aussetzung/);
    expect(plain).toMatch(/nicht automatisch versandt/);
  });
});
