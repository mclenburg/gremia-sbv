import {
  type ParticipationViolationStage,
  type SbvParticipationViolationRecord,
  type SbvParticipationViolationTemplateInput,
  type SbvParticipationViolationTemplateValidationResult,
} from '../src/app/core/models/sbv-participation-violation.model.js';
import { sbvParticipationViolationDocumentStageLabels } from '../src/app/core/labels/sbvParticipationViolationLabels.js';

export const SBV_PARTICIPATION_VIOLATION_TEMPLATE_VERSION = '0.9.4-v1';

const TEMPLATE_KEY_BY_STAGE: Record<ParticipationViolationStage, string> = {
  request: 'sbv-participation-violation-request',
  formal_objection: 'sbv-participation-violation-formal-objection',
  abmahnung: 'sbv-participation-violation-abmahnung',
  suspension_request: 'sbv-participation-violation-suspension-request',
  owi_preparation: 'sbv-participation-violation-owi-preparation',
};

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sanitizeText(value: string | undefined, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function addIfMissing(missing: string[], label: string, value: unknown): void {
  if (!nonEmpty(value)) missing.push(label);
}

export class SbvParticipationViolationTemplateService {
  getTemplateKey(stage: ParticipationViolationStage): string {
    return TEMPLATE_KEY_BY_STAGE[stage];
  }

  getTemplateVersion(): string {
    return SBV_PARTICIPATION_VIOLATION_TEMPLATE_VERSION;
  }

  buildInputFromViolation(record: SbvParticipationViolationRecord, options: Partial<Pick<SbvParticipationViolationTemplateInput, 'recipientLabel' | 'privacyMode' | 'includeLegalReviewHint' | 'includeOwiHint'>> = {}): SbvParticipationViolationTemplateInput {
    return {
      stage: record.stage,
      subject: record.subject,
      recipientLabel: sanitizeText(options.recipientLabel, 'Arbeitgeber'),
      sourceReference: this.buildSourceReference(record),
      measureDescription: record.measureDescription,
      wrongBehavior: record.wrongBehavior,
      requiredBehavior: record.requiredBehavior,
      consequenceWarning: record.consequenceWarning,
      followUpDueAt: record.followUpDueAt,
      includeOwiHint: options.includeOwiHint ?? record.stage === 'owi_preparation',
      includeLegalReviewHint: options.includeLegalReviewHint ?? ['abmahnung', 'suspension_request', 'owi_preparation'].includes(record.stage),
      privacyMode: options.privacyMode ?? 'case_reference',
    };
  }

  validate(input: SbvParticipationViolationTemplateInput): SbvParticipationViolationTemplateValidationResult {
    const missingFields: string[] = [];
    const warnings: string[] = [];
    addIfMissing(missingFields, 'Betreff', input.subject);
    addIfMissing(missingFields, 'Bezugsangabe', input.sourceReference);
    addIfMissing(missingFields, 'Maßnahme / Sachverhalt', input.measureDescription);
    addIfMissing(missingFields, 'Pflichtverstoß', input.wrongBehavior);
    addIfMissing(missingFields, 'Richtiges Verfahren', input.requiredBehavior);

    if (input.stage === 'request') {
      addIfMissing(missingFields, 'angeforderte Unterlagen / Handlung', input.requiredBehavior);
    }
    if (input.stage === 'formal_objection') {
      addIfMissing(missingFields, 'Korrekturverlangen', input.requiredBehavior);
    }
    if (input.stage === 'abmahnung') {
      addIfMissing(missingFields, 'Konsequenzwarnung', input.consequenceWarning);
    }
    if (input.stage === 'suspension_request') {
      addIfMissing(missingFields, 'Aussetzungs- und Nachholungsverlangen', input.requiredBehavior);
      addIfMissing(missingFields, 'Wiedervorlage / Nachholfrist', input.followUpDueAt);
    }
    if (input.stage === 'owi_preparation') {
      addIfMissing(missingFields, 'Grund für wiederholten oder gewichtigen Verstoß', input.wrongBehavior);
      if (!input.includeOwiHint) warnings.push('OWi-Hinweis ist für diese Stufe fachlich vorgesehen.');
    }
    if (['abmahnung', 'suspension_request', 'owi_preparation'].includes(input.stage) && !input.includeLegalReviewHint) {
      warnings.push('Scharfe Eskalationsstufen sollten anwaltlich geprüft werden.');
    }
    if (input.privacyMode === 'personalized') {
      warnings.push('Personalisierte Schreiben können sensible Gesundheits- oder GdB-Bezüge enthalten. Datenschutz vor Verwendung prüfen.');
    }
    return { valid: missingFields.length === 0, missingFields, warnings };
  }

  buildPlainText(input: SbvParticipationViolationTemplateInput): string {
    const validation = this.validate(input);
    if (!validation.valid) throw new Error(`Pflichtangaben fehlen: ${validation.missingFields.join(', ')}`);
    const salutation = input.recipientLabel ? `Sehr geehrte Damen und Herren,` : 'Sehr geehrte Damen und Herren,';
    const sections: string[] = [];
    sections.push(sbvParticipationViolationDocumentStageLabels[input.stage]);
    sections.push(`Betreff: ${input.subject}`);
    sections.push(`Bezug: ${input.sourceReference}`);
    sections.push(salutation);
    sections.push(`ich dokumentiere als Schwerbehindertenvertretung folgenden Vorgang im Zusammenhang mit der Beteiligung nach § 178 Abs. 2 Satz 1 SGB IX.`);
    sections.push(`Sachverhalt / Maßnahme:\n${input.measureDescription}`);
    sections.push(`Beanstandetes Verhalten:\n${input.wrongBehavior}`);
    sections.push(`Richtiges Verfahren:\n${input.requiredBehavior}`);
    if (input.stage === 'suspension_request') {
      sections.push('Ich verlange die Aussetzung der Durchführung oder Vollziehung der ohne ordnungsgemäße SBV-Beteiligung getroffenen Entscheidung. Die Beteiligung ist innerhalb von sieben Tagen nachzuholen (§ 178 Abs. 2 Satz 2 SGB IX).');
    }
    if (input.consequenceWarning) sections.push(`Warn- und Konsequenzhinweis:\n${input.consequenceWarning}`);
    if (input.includeOwiHint) {
      sections.push('Hinweis: Eine nicht, nicht richtig, nicht vollständig oder nicht rechtzeitig erfolgte Unterrichtung bzw. Anhörung der SBV kann nach § 238 Abs. 1 Nr. 8 SGB IX eine Ordnungswidrigkeit darstellen. Zuständige Verwaltungsbehörde ist nach § 238 Abs. 3 SGB IX die Bundesagentur für Arbeit.');
    }
    if (input.followUpDueAt) sections.push(`Frist / Wiedervorlage: ${new Date(input.followUpDueAt).toLocaleDateString('de-DE')}`);
    if (input.includeLegalReviewHint) sections.push('Hinweis der App: Diese Eskalationsstufe sollte bei streitigen oder folgenreichen Sachverhalten anwaltlich abgestimmt werden.');
    sections.push('Dieses Schreiben wird nicht automatisch versandt. Jede externe Verwendung bleibt eine bewusste Handlung der SBV.');
    sections.push('Mit freundlichen Grüßen\nSchwerbehindertenvertretung');
    return sections.join('\n\n');
  }

  private buildSourceReference(record: SbvParticipationViolationRecord): string {
    if (record.caseId) return `Fallbezug ${record.caseId}`;
    return `${record.sourceContextType}:${record.sourceContextId}`;
  }
}
