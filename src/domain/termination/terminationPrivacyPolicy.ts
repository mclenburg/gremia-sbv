import type { TerminationHearingRecord } from '../models/termination.model.js';

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
