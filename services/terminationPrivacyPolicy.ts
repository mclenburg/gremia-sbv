import type { TerminationHearingRecord } from '../src/app/core/models/termination.model.js';

export type TerminationPrivacyRisk = 'normal' | 'confidential' | 'highly_confidential' | 'critical';

export interface TerminationPrivacyFieldClassification {
  field: keyof TerminationHearingRecord;
  label: string;
  risk: TerminationPrivacyRisk;
  reason: string;
  exportRelevant: boolean;
}

export const TERMINATION_PRIVACY_FIELD_CLASSIFICATIONS: TerminationPrivacyFieldClassification[] = [
  {
    field: 'protectionStatus',
    label: 'Schutzstatus',
    risk: 'highly_confidential',
    reason: 'Kann Rückschlüsse auf Schwerbehinderung, Gleichstellung oder laufende Antragsverfahren zulassen.',
    exportRelevant: true
  },
  {
    field: 'employerReason',
    label: 'Arbeitgebervortrag / Kündigungsgrund',
    risk: 'critical',
    reason: 'Kann Leistungs-, Verhaltens-, Gesundheits- oder Konfliktdaten enthalten.',
    exportRelevant: true
  },
  {
    field: 'missingInformation',
    label: 'Fehlende Unterlagen',
    risk: 'confidential',
    reason: 'Kann indirekt sensible Kündigungs- und Gesundheitsbezüge offenlegen.',
    exportRelevant: true
  },
  {
    field: 'sbvAssessment',
    label: 'SBV-Bewertung',
    risk: 'critical',
    reason: 'Enthält die fachliche Bewertung der SBV und kann Gesundheitsdaten oder behinderungsbedingte Nachteile enthalten.',
    exportRelevant: true
  },
  {
    field: 'statement',
    label: 'SBV-Stellungnahme',
    risk: 'critical',
    reason: 'Kann besonders schutzbedürftige Angaben enthalten und wird regelmäßig an Dritte übermittelt.',
    exportRelevant: true
  },
  {
    field: 'integrationOfficeDecision',
    label: 'Integrationsamt – Stand / Entscheidung',
    risk: 'highly_confidential',
    reason: 'Bezieht sich unmittelbar auf den besonderen Kündigungsschutz nach §§ 168 ff. SGB IX.',
    exportRelevant: true
  }
];

export function buildTerminationExportContext(process: TerminationHearingRecord): string {
  return [
    `Schutzstatus: ${process.protectionStatus}`,
    `Kündigungsart: ${process.terminationType}`,
    `Status: ${process.status}`,
    `Integrationsamt: ${process.integrationOfficeDecision ?? ''}`,
    `Arbeitgebervortrag: ${process.employerReason ?? ''}`,
    `Fehlende Unterlagen: ${process.missingInformation ?? ''}`,
    `SBV-Bewertung: ${process.sbvAssessment ?? ''}`,
    `SBV-Stellungnahme: ${process.statement ?? ''}`
  ].join('\n');
}

export function terminationPrivacyExportNotice(): string {
  return 'Kündigungsanhörungen enthalten regelmäßig besonders schutzbedürftige Beschäftigtendaten. Exporte sind nur mit dokumentiertem Zweck und minimal notwendigem Inhalt zulässig.';
}
