import type { SbvResourceRecordKind, SbvResourceRecordStatus } from '../../../domain/models/sbv-resource.model';
import type { SbvControlProtocolPartner, SbvControlProtocolStatus, SbvControlProtocolTopic } from '../../../domain/models/sbv-control-protocol.model';

export type ControlSectionId =
  | 'resources'
  | 'meetings'
  | 'assembly'
  | 'complaints'
  | 'protocols'
  | 'participation'
  | 'obligations'
  | 'inclusion'
  | 'reports';

export const resourceKindLabels: Record<SbvResourceRecordKind, string> = {
  training: 'Schulung',
  deputy_involvement: 'Heranziehung Stellvertretung',
  equipment: 'Sachmittel / sichere IT',
  other: 'Sonstiger Nachweis'
};

export const resourceStatusLabels: Record<SbvResourceRecordStatus, string> = {
  planned: 'geplant',
  requested: 'beantragt',
  approved: 'genehmigt',
  completed: 'durchgeführt',
  rejected: 'abgelehnt',
  documented: 'dokumentiert'
};


export const protocolPartnerLabels: Record<SbvControlProtocolPartner, string> = {
  employer: 'Arbeitgeber',
  works_council: 'Betriebsrat',
  joint: 'Arbeitgeber und Betriebsrat',
  other: 'Sonstige Beteiligte',
};

export const protocolTopicLabels: Record<SbvControlProtocolTopic, string> = {
  workplace_rules: 'Betriebliche Regelung',
  inclusion_agreement: 'Inklusionsvereinbarung',
  accessibility: 'Barrierefreiheit / Arbeitsplatzgestaltung',
  procedure: 'Verfahren / Beteiligung',
  cooperation: 'Zusammenarbeit',
  other: 'Sonstiges Grundsatzthema',
};

export const protocolStatusLabels: Record<SbvControlProtocolStatus, string> = {
  draft: 'Entwurf',
  documented: 'dokumentiert',
  follow_up_open: 'Nachverfolgung offen',
  closed: 'abgeschlossen',
};
