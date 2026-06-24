import type {
  ParticipationViolationStage,
  ParticipationViolationStatus,
  ParticipationViolationType,
} from '../models/sbv-participation-violation.model';
import { PARTICIPATION_VIOLATION_STAGES, PARTICIPATION_VIOLATION_TYPES } from '../models/sbv-participation-violation.model';

export const sbvParticipationViolationStageLabels: Record<ParticipationViolationStage, string> = {
  request: 'Freundliche Nachforderung',
  formal_objection: 'Förmliche Beteiligungsrüge',
  abmahnung: 'Betriebsverfassungsrechtliche Abmahnung',
  suspension_request: 'Aussetzungsverlangen',
  owi_preparation: 'OWi-Hinweis / Vorbereitung Anzeige',
};

export const sbvParticipationViolationDocumentStageLabels: Record<ParticipationViolationStage, string> = {
  ...sbvParticipationViolationStageLabels,
  suspension_request: 'Aussetzungsverlangen nach § 178 Abs. 2 Satz 2 SGB IX',
  owi_preparation: 'OWi-Hinweis / Vorbereitung einer Anzeige',
};

export const sbvParticipationViolationStatusLabels: Record<ParticipationViolationStatus, string> = {
  draft: 'Entwurf',
  open: 'offen',
  sent: 'versandt/dokumentiert',
  remedied: 'geheilt',
  escalated: 'eskaliert',
  closed: 'geschlossen',
  withdrawn: 'zurückgezogen',
};

export const sbvParticipationViolationTypeLabels: Record<ParticipationViolationType, string> = {
  not_informed: 'nicht unterrichtet',
  late_informed: 'verspätet unterrichtet',
  incomplete_information: 'unvollständig unterrichtet',
  not_heard: 'nicht angehört',
  late_heard: 'verspätet angehört',
  implementation_without_participation: 'Vollziehung ohne Beteiligung',
  repeated_violation: 'wiederholter Verstoß',
  other: 'sonstiger Verstoß',
};

export const sbvParticipationViolationStageOptions = PARTICIPATION_VIOLATION_STAGES.map((stage) => ({
  value: stage,
  label: sbvParticipationViolationStageLabels[stage],
}));

export const sbvParticipationViolationTypeOptions = PARTICIPATION_VIOLATION_TYPES.map((type) => ({
  value: type,
  label: sbvParticipationViolationTypeLabels[type],
}));
