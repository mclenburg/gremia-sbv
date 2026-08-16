import type { ControlSectionId } from './sbvControlTypes';
export type { ControlSectionId } from './sbvControlTypes';

export interface SbvControlSectionCounts {
  resources: number;
  meetings: number;
  assemblies: number;
  assemblyWarning: boolean;
  complaints: number;
  openProtocolFollowUps: number;
  criticalParticipation: number;
  obligations: number;
  agreements: number;
  month: string;
}

export function buildSbvControlSections(counts: SbvControlSectionCounts): Array<{ id: ControlSectionId; title: string; summary: string }> {
  return [
    { id: 'resources', title: 'Nachweise', summary: `${counts.resources} Einträge` },
    { id: 'meetings', title: 'Gremien', summary: `${counts.meetings} Sitzungen` },
    { id: 'assembly', title: 'Versammlung', summary: counts.assemblyWarning ? 'Jahresversammlung offen' : `${counts.assemblies} Vorgänge` },
    { id: 'complaints', title: 'Beschwerden', summary: `${counts.complaints} Vorgänge` },
    { id: 'protocols', title: 'Protokolle', summary: `${counts.openProtocolFollowUps} offen` },
    { id: 'participation', title: 'Beteiligung', summary: `${counts.criticalParticipation} kritisch` },
    { id: 'obligations', title: 'Arbeitgeberpflichten', summary: `${counts.obligations} Prüfvorgänge` },
    { id: 'inclusion', title: 'Inklusionsvereinbarung', summary: `${counts.agreements} Akten` },
    { id: 'reports', title: 'Berichte', summary: counts.month },
  ];
}
