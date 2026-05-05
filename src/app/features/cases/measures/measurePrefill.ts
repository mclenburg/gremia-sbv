import type { CaseRecord } from '../../../core/models/case.model';
import type { CaseMeasureRiskLevel } from '../../../core/models/case-measure.model';
import type { ParticipationMeasureType } from '../../../core/models/participation.model';
import type { WorkplaceAccommodationCategory } from '../../../core/models/workplace-accommodation.model';

export type PrefillFieldState = 'prefilled' | 'manual';

export type PrefilledValue<T> = {
  value: T;
  state: PrefillFieldState;
};

export type MeasurePrefillKind =
  | 'bem'
  | 'prevention'
  | 'participation'
  | 'termination'
  | 'equalization'
  | 'workplace_accommodation';

export type MeasurePrefillContext = {
  selectedCase?: CaseRecord;
  commandText?: string;
  createdFrom: 'manual' | 'inline_command';
  now?: Date;
};

function cleanText(value?: string): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function todayLocalDateTime(now = new Date()): string {
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function hasAny(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}

function riskFromCase(selectedCase?: CaseRecord): CaseMeasureRiskLevel {
  if (selectedCase?.priority === 'kritisch') return 'kritisch';
  if (selectedCase?.priority === 'wichtig') return 'erhoeht';
  return 'normal';
}

function elevatedUnlessCritical(selectedCase?: CaseRecord): CaseMeasureRiskLevel {
  return selectedCase?.priority === 'kritisch' ? 'kritisch' : 'erhoeht';
}

export function extractInlineCommandArgument(value: string, markerIndex: number, token: string): string {
  if (markerIndex < 0 || !value.slice(markerIndex).startsWith(token)) return '';
  const afterToken = value.slice(markerIndex + token.length);
  const newlineIndex = afterToken.search(/[\r\n]/);
  const segment = newlineIndex >= 0 ? afterToken.slice(0, newlineIndex) : afterToken;
  return cleanText(segment);
}

export function getInlineCommandRangeLength(token: string, commandText?: string): number {
  const suffix = cleanText(commandText);
  return token.length + (suffix ? suffix.length + 1 : 0);
}

export function prefillMarkerProps(isPrefilled: boolean) {
  return isPrefilled
    ? { 'data-prefill': 'true', 'aria-label': 'automatisch vorbelegt', title: 'automatisch vorbelegt' }
    : {};
}

export function buildBemPrefill(context: MeasurePrefillContext) {
  const text = cleanText(context.commandText);
  return {
    title: { value: text || 'BEM-Vorgang prüfen', state: 'prefilled' as const },
    triggerDescription: { value: text, state: text ? 'prefilled' as const : 'manual' as const },
    triggerType: { value: hasAny(text, ['sechs', '6 wochen', 'längere au', 'langzeit', 'krank']) ? 'sechs_wochen_au' : 'sbv_anregung', state: 'prefilled' as const },
    responseDueAt: { value: '', state: 'manual' as const },
    nextStep: { value: 'BEM-Angebot, Einwilligung und Beteiligte klären.', state: 'prefilled' as const },
    requiresFollowUp: context.createdFrom === 'inline_command'
  };
}

export function buildPreventionPrefill(context: MeasurePrefillContext) {
  const text = cleanText(context.commandText);
  const difficultyType = hasAny(text, ['führung', 'konflikt']) ? 'konflikt_fuehrung'
    : hasAny(text, ['überlast', 'gesund', 'krank']) ? 'gesundheitlich_arbeitsplatzbezogen'
    : 'sonstiges';
  const riskType = hasAny(text, ['kündigung']) ? 'kuendigung'
    : hasAny(text, ['abmahnung']) ? 'abmahnung'
    : hasAny(text, ['überlast']) ? 'ueberlastung'
    : 'arbeitsplatzverlust';
  return {
    title: { value: text || 'Präventionsverfahren prüfen', state: 'prefilled' as const },
    hazardDescription: { value: text, state: text ? 'prefilled' as const : 'manual' as const },
    difficultyType: { value: difficultyType, state: 'prefilled' as const },
    riskType: { value: riskType, state: 'prefilled' as const },
    employerResponseDueAt: { value: '', state: 'manual' as const },
    nextStep: { value: 'Schwierigkeiten konkretisieren und Präventionsverfahren nach § 167 Abs. 1 SGB IX anstoßen.', state: 'prefilled' as const },
    requiresFollowUp: context.createdFrom === 'inline_command'
  };
}

export function buildParticipationPrefill(context: MeasurePrefillContext) {
  const text = cleanText(context.commandText);
  const measureType: ParticipationMeasureType = hasAny(text, ['versetzung', 'umsetzung']) ? 'versetzung'
    : hasAny(text, ['kündigung', 'kuendigung']) ? 'kuendigung'
    : hasAny(text, ['arbeitszeit', 'teilzeit']) ? 'arbeitszeit'
    : hasAny(text, ['arbeitsplatz', 'desksharing', 'platz']) ? 'arbeitsplatzgestaltung'
    : hasAny(text, ['abmahnung']) ? 'abmahnung'
    : 'sonstiges';
  const riskLevel: CaseMeasureRiskLevel = measureType === 'kuendigung' ? 'kritisch' : elevatedUnlessCritical(context.selectedCase);
  return {
    title: { value: text || 'SBV-Beteiligung prüfen', state: 'prefilled' as const },
    employerMeasure: { value: text, state: text ? 'prefilled' as const : 'manual' as const },
    measureType: { value: measureType, state: 'prefilled' as const },
    riskLevel: { value: riskLevel, state: 'prefilled' as const },
    statementDueAt: { value: '', state: 'manual' as const },
    nextStep: { value: 'Unterrichtung prüfen, Unterlagen anfordern und Beteiligung nach § 178 Abs. 2 SGB IX sichern.', state: 'prefilled' as const },
    firstKnownAt: { value: todayLocalDateTime(context.now), state: 'prefilled' as const },
    requiresFollowUp: context.createdFrom === 'inline_command'
  };
}

export function buildTerminationPrefill(context: MeasurePrefillContext) {
  const text = cleanText(context.commandText);
  const terminationType = hasAny(text, ['außerordentlich', 'fristlos']) ? 'ausserordentlich'
    : hasAny(text, ['änderung', 'aenderung']) ? 'aenderungskuendigung'
    : hasAny(text, ['personenbedingt']) ? 'personenbedingt'
    : hasAny(text, ['verhaltensbedingt']) ? 'verhaltensbedingt'
    : hasAny(text, ['betriebsbedingt']) ? 'betriebsbedingt'
    : hasAny(text, ['ordentlich']) ? 'ordentlich'
    : 'sonstiges';
  return {
    title: { value: text || 'Kündigungsanhörung prüfen', state: 'prefilled' as const },
    terminationType: { value: terminationType, state: 'prefilled' as const },
    protectionStatus: { value: 'unklar', state: 'prefilled' as const },
    receivedAt: { value: todayLocalDateTime(context.now), state: 'prefilled' as const },
    sbvStatementDueAt: { value: '', state: 'manual' as const },
    employerReason: { value: text, state: text ? 'prefilled' as const : 'manual' as const },
    nextStep: { value: 'Fristen sichern, Schutzstatus und Zustimmung des Integrationsamts prüfen.', state: 'prefilled' as const },
    riskLevel: { value: 'kritisch' as CaseMeasureRiskLevel, state: 'prefilled' as const },
    requiresFollowUp: true
  };
}

export function buildEqualizationPrefill(context: MeasurePrefillContext) {
  const text = cleanText(context.commandText);
  const status = hasAny(text, ['widerspruch']) ? 'widerspruch'
    : hasAny(text, ['bescheid', 'abgelehnt']) ? 'nachfrage'
    : hasAny(text, ['antrag', 'beantragt']) ? 'vorbereitung'
    : 'beratung';
  return {
    title: { value: text || 'Gleichstellung/GdB prüfen', state: 'prefilled' as const },
    status: { value: status, state: 'prefilled' as const },
    note: { value: text, state: text ? 'prefilled' as const : 'manual' as const },
    objectionDueAt: { value: '', state: 'manual' as const },
    nextStep: { value: 'Beratungsstand, Antrag/Bescheid und mögliche Fristen klären.', state: 'prefilled' as const },
    riskLevel: { value: riskFromCase(context.selectedCase), state: 'prefilled' as const },
    requiresFollowUp: context.createdFrom === 'inline_command'
  };
}

export function buildWorkplaceAccommodationPrefill(context: MeasurePrefillContext) {
  const text = cleanText(context.commandText);
  const category: WorkplaceAccommodationCategory = hasAny(text, ['desksharing', 'fester arbeitsplatz', 'sitzplatz']) ? 'arbeitsplatz'
    : hasAny(text, ['homeoffice', 'mobil', 'arbeitsort']) ? 'arbeitsort'
    : hasAny(text, ['arbeitszeit', 'pause', 'teilzeit']) ? 'arbeitszeit'
    : hasAny(text, ['software', 'barrierefrei']) ? 'software_barrierefreiheit'
    : hasAny(text, ['hilfsmittel', 'technik', 'tastatur', 'monitor']) ? 'technische_arbeitshilfe'
    : hasAny(text, ['qualifizierung', 'schulung']) ? 'qualifizierung'
    : hasAny(text, ['aufgabe', 'tätigkeit']) ? 'aufgabenanpassung'
    : 'sonstiges';
  return {
    title: { value: text || 'Arbeitsplatzgestaltung prüfen', state: 'prefilled' as const },
    requestedAdjustment: { value: text, state: text ? 'prefilled' as const : 'manual' as const },
    category: { value: category, state: 'prefilled' as const },
    riskLevel: { value: elevatedUnlessCritical(context.selectedCase), state: 'prefilled' as const },
    implementationDueAt: { value: '', state: 'manual' as const },
    nextStep: { value: 'Bedarf konkretisieren und Arbeitgeber zur Prüfung nach § 164 Abs. 4 SGB IX auffordern.', state: 'prefilled' as const },
    legalBasis: { value: '§ 164 Abs. 4 SGB IX', state: 'prefilled' as const },
    employerResponseStatus: { value: 'offen', state: 'prefilled' as const },
    requiresFollowUp: context.createdFrom === 'inline_command'
  };
}
