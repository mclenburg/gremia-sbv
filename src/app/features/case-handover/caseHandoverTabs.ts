export type CaseHandoverTabId =
  | 'overview'
  | 'vacation'
  | 'return'
  | 'office'
  | 'import'
  | 'protocol';

export const CASE_HANDOVER_TABS: Array<{
  id: CaseHandoverTabId;
  title: string;
  description: string;
}> = [
  {
    id: 'overview',
    title: 'Übersicht',
    description: 'Status, offene Schritte und passende Einstiegspunkte.',
  },
  {
    id: 'vacation',
    title: 'Urlaubsvertretung',
    description: 'Zeitlich begrenzt ausgewählte Fallakten übergeben.',
  },
  {
    id: 'return',
    title: 'Rückgabe',
    description: 'Änderungen aus einer Vertretung als Delta zurückführen.',
  },
  {
    id: 'office',
    title: 'Amtsübergabe',
    description: 'Dauerhaften Amtsbestand an die Nachfolge übergeben.',
  },
  {
    id: 'import',
    title: 'Import',
    description: 'Übergabepakete vor dem Schreiben prüfen und übernehmen.',
  },
  {
    id: 'protocol',
    title: 'Protokoll',
    description: 'Lokale Nachweise zu Übergaben und Rückgaben ansehen.',
  },
];
