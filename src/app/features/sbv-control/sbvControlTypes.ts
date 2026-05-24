import type { SbvResourceRecordKind, SbvResourceRecordStatus } from '../../core/models/sbv-resource.model';

export type ControlSectionId =
  | 'resources'
  | 'participation'
  | 'obligations'
  | 'inclusion'
  | 'reports';

export type ObligationItem = {
  id: string;
  title: string;
  legalBasis: string;
  cadence: string;
  evidence: string;
  sbvAction: string;
  risk: 'normal' | 'warning' | 'critical';
};

export type InclusionTopic = {
  id: string;
  title: string;
  legalBasis: string;
  sbvGoal: string;
  enforceableAnchor: string;
};

export const employerObligations: ObligationItem[] = [
  {
    id: 'anzeige-163',
    title: 'Anzeige / Verzeichnis',
    legalBasis: '§ 163 Abs. 2 SGB IX',
    cadence: 'jährlich',
    evidence: 'Anzeige, Verzeichnis, Kopie an BR/SBV',
    sbvAction: 'Kopie freundlich mit Frist anfordern und Vorgang dokumentieren.',
    risk: 'warning'
  },
  {
    id: 'beschaeftigungsquote',
    title: 'Beschäftigungspflicht',
    legalBasis: '§ 154 Abs. 1 SGB IX, § 160 SGB IX',
    cadence: 'jährlich / Personalplanung',
    evidence: 'Quote, Pflichtplätze, besondere Gruppen, Ausgleichsabgabe',
    sbvAction: 'Quote nicht nur statistisch lesen, sondern als Argument für Besetzung, Qualifizierung und Arbeitsplatzgestaltung nutzen.',
    risk: 'normal'
  },
  {
    id: 'freie-arbeitsplaetze',
    title: 'Freie Arbeitsplätze prüfen',
    legalBasis: '§ 164 Abs. 1 Satz 1 SGB IX',
    cadence: 'jede Besetzung',
    evidence: 'freie Stelle, Prüfvermerk, Agenturkontakt, Beteiligung der Interessenvertretungen',
    sbvAction: 'Bei fehlender Prüfung Beteiligungsvorgang anlegen oder Unterlagen nachfordern.',
    risk: 'critical'
  },
  {
    id: 'bem-praevention',
    title: 'BEM / Prävention',
    legalBasis: '§ 167 Abs. 1 und Abs. 2 SGB IX',
    cadence: 'laufend',
    evidence: 'BEM-Angebote, Präventionsfälle, Maßnahmenumsetzung',
    sbvAction: 'Alibi-Verfahren als Strukturmangel dokumentieren und konkrete Nachsteuerung verlangen.',
    risk: 'warning'
  },
  {
    id: 'inklusionsvereinbarung',
    title: 'Inklusionsvereinbarung',
    legalBasis: '§ 166 SGB IX',
    cadence: 'jährlich / bei Änderungen',
    evidence: 'Regelungsstand, Lücken, Arbeitgeberantworten',
    sbvAction: 'Fortschreibung mit verbindlichen Mindestunterlagen, Fristen und Eskalationswegen führen.',
    risk: 'warning'
  }
];

export const inclusionTopics: InclusionTopic[] = [
  {
    id: 'beteiligung',
    title: 'SBV-Beteiligung verbindlich machen',
    legalBasis: '§ 178 Abs. 2 Satz 1 SGB IX',
    sbvGoal: 'Keine Entscheidung ohne vorherige Unterrichtung und Anhörung.',
    enforceableAnchor: 'Mindestunterlagen, Fristen, Eskalation, Dokumentationspflicht.'
  },
  {
    id: 'arbeitsplatz',
    title: 'Arbeitsplatzgestaltung operationalisieren',
    legalBasis: '§ 164 Abs. 4 Satz 1 SGB IX',
    sbvGoal: 'Arbeitsplatz, Arbeitsorganisation, Arbeitszeit und Hilfen werden früh geprüft.',
    enforceableAnchor: 'Prüfmatrix, Umsetzungsfristen, Verantwortliche, Nachkontrolle.'
  },
  {
    id: 'praevention',
    title: 'Prävention vor Eskalation',
    legalBasis: '§ 167 Abs. 1 SGB IX',
    sbvGoal: 'Gefährdungen lösen sofort ein Präventionsverfahren aus.',
    enforceableAnchor: 'Sofortmeldung, Maßnahmenplan, Einbindung Inklusionsamt.'
  },
  {
    id: 'bem',
    title: 'BEM als Prozess sichern',
    legalBasis: '§ 167 Abs. 2 SGB IX',
    sbvGoal: 'Freiwillig, vertraulich, maßnahmenorientiert.',
    enforceableAnchor: 'Einladung, Datenschutz, Beteiligungswahl, Evaluation.'
  }
];

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
