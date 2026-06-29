import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  ClipboardCheck,
  CalendarClock,
  FileText,
  FolderKanban,
  HeartPulse,
  Scale,
  ShieldAlert,
  ShieldCheck,
  BriefcaseBusiness,
  UserRoundCheck,
  Users,
  Wrench
} from 'lucide-react';

export type ViewId =
  | 'dashboard'
  | 'cases'
  | 'deadlines'
  | 'activity_journal'
  | 'participation_violations'
  | 'persons'
  | 'bem'
  | 'prevention'
  | 'participation'
  | 'recruiting_participations'
  | 'workplace_accommodation'
  | 'equalization'
  | 'termination_hearing'
  | 'templates'
  | 'knowledge'
  | 'contacts'
  | 'sbv_control'
  | 'reports'
  | 'compliance'
  | 'settings';

export type ModuleIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

export interface ModuleDefinition {
  id: Exclude<ViewId, 'dashboard' | 'settings'>;
  title: string;
  shortTitle: string;
  text: string;
  icon: ModuleIcon;
  status?: 'active' | 'planned';
  plannedVersion?: string;
  group: ModuleGroupId;
}

export type ModuleGroupId = 'core' | 'processes' | 'tools' | 'administration';

export interface ModuleGroupDefinition {
  id: ModuleGroupId;
  label: string;
  description: string;
}

export const moduleGroups: ModuleGroupDefinition[] = [
  { id: 'core', label: 'Kernarbeit', description: 'Personen, Fallakten und Fristen.' },
  { id: 'processes', label: 'SBV-Verfahren', description: 'BEM, Prävention, Beteiligung und Schutzverfahren.' },
  { id: 'tools', label: 'Werkzeuge', description: 'Vorlagen, Wissen, Kontakte und Berichte.' },
  { id: 'administration', label: 'Administration', description: 'Compliance, Steuerung und Einstellungen.' },
];

export const modules: ModuleDefinition[] = [
  {
    id: 'persons',
    title: 'Personenverzeichnis',
    shortTitle: 'Personen',
    text: 'Führender Datensatz: Schutzstatus, Import, Personenbindung und Datenschutz-Lifecycle.',
    icon: UserRoundCheck,
    group: 'core'
  },
  {
    id: 'cases',
    title: 'Fälle',
    shortTitle: 'Fallakte',
    text: 'Fallakte, Vorgang, Gesprächsnotizen und Protokolle.',
    icon: FolderKanban,
    group: 'core'
  },
  {
    id: 'deadlines',
    title: 'Fristen',
    shortTitle: 'Fristen',
    text: 'Fristen und Wiedervorlagen. Ab 48h zwingend auf dem Dashboard.',
    icon: CalendarClock,
    group: 'core'
  },
  {
    id: 'activity_journal',
    title: 'Tätigkeitsjournal',
    shortTitle: 'Journal',
    text: 'SBV-Eigenaufzeichnung zu Tätigkeiten und optionaler SBV-Zeit.',
    icon: ClipboardList,
    group: 'core'
  },

  {
    id: 'bem',
    title: 'BEM',
    shortTitle: 'BEM',
    text: 'Einladung, Zustimmung, Maßnahmen, Evaluation.',
    icon: HeartPulse,
    group: 'processes'
  },
  {
    id: 'prevention',
    title: 'Präventionsverfahren',
    shortTitle: 'Prävention',
    text: 'Frühzeitige Aktivierung nach § 167 Abs. 1 SGB IX.',
    icon: ShieldAlert,
    group: 'processes'
  },

  {
    id: 'participation_violations',
    title: 'Beteiligungsverstöße',
    shortTitle: 'Verstöße',
    text: 'Pflichtverletzungen bei SBV-Unterrichtung und Anhörung beweissicher protokollieren.',
    icon: ShieldAlert,
    group: 'processes'
  },
  {
    id: 'participation',
    title: 'SBV-Beteiligung',
    shortTitle: 'Beteiligung',
    text: 'Unterrichtung, Anhörung und Aussetzung nach § 178 Abs. 2 SGB IX.',
    icon: ShieldCheck,
    group: 'processes'
  },

  {
    id: 'recruiting_participations',
    title: 'Stellenbesetzungen',
    shortTitle: 'Stellenbesetzungen',
    text: 'SBV-Beteiligung bei Bewerbungen schwerbehinderter Menschen fallaktenunabhängig nachhalten.',
    icon: BriefcaseBusiness,
    group: 'processes'
  },
  {
    id: 'workplace_accommodation',
    title: 'Arbeitsplatzgestaltung',
    shortTitle: 'Arbeitsplatz',
    text: 'Behinderungsgerechte Beschäftigung nach § 164 Abs. 4 SGB IX.',
    icon: Wrench,
    group: 'processes'
  },
  {
    id: 'equalization',
    title: 'Gleichstellung / GdB',
    shortTitle: 'Gleichstellung',
    text: 'Antrag, Sachstand, Bescheid, Widerspruchsfrist.',
    icon: Scale,
    group: 'processes'
  },
  {
    id: 'termination_hearing',
    title: 'Kündigungsanhörung',
    shortTitle: 'Kündigung',
    text: 'Kritischer Workflow für SBV-Anhörung und Integrationsamt-Prüfung.',
    icon: ShieldAlert,
    group: 'processes'
  },
  {
    id: 'templates',
    title: 'Vorlagen',
    shortTitle: 'Vorlagen',
    text: 'Schriftverkehr, Platzhalter, Standardschreiben.',
    icon: FileText,
    group: 'tools'
  },
  {
    id: 'knowledge',
    title: 'Wissen',
    shortTitle: 'Wissen',
    text: 'Normen, Notizen, Fallverknüpfungen.',
    icon: BookOpen,
    group: 'tools'
  },
  {
    id: 'contacts',
    title: 'Kontakte',
    shortTitle: 'Kontakte',
    text: 'Inklusionsamt, Betriebsarzt, Agentur, Beratungsstellen.',
    icon: Users,
    group: 'tools'
  },
  {
    id: 'compliance',
    title: 'Compliance Center',
    shortTitle: 'Compliance',
    text: 'TOMs, DSFA, DSGVO/BDSG und Freigabeformular.',
    icon: ShieldCheck,
    group: 'administration'
  },
  {
    id: 'sbv_control',
    title: 'SBV-Steuerung',
    shortTitle: 'Steuerung',
    text: 'Beteiligungsqualität, Inklusionsvereinbarung, Arbeitgeberpflichten, Ressourcen und Fallabschluss.',
    icon: ClipboardCheck,
    group: 'administration'
  },
  {
    id: 'reports',
    title: 'Berichte',
    shortTitle: 'Berichte',
    text: 'Anonymisierte Tätigkeitsberichte und Auswertungen.',
    icon: BarChart3,
    group: 'tools'
  }
];
