import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  CalendarClock,
  FileText,
  FolderKanban,
  HardDrive,
  HeartPulse,
  Scale,
  ShieldAlert,
  Users
} from 'lucide-react';

export type ViewId =
  | 'dashboard'
  | 'cases'
  | 'deadlines'
  | 'bem'
  | 'prevention'
  | 'equalization'
  | 'termination'
  | 'templates'
  | 'knowledge'
  | 'contacts'
  | 'reports'
  | 'portable'
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
}

export const modules: ModuleDefinition[] = [
  {
    id: 'cases',
    title: 'Fälle',
    shortTitle: 'Fallakte',
    text: 'Fallakte, Vorgang, Gesprächsnotizen und Protokolle.',
    icon: FolderKanban
  },
  {
    id: 'deadlines',
    title: 'Fristen',
    shortTitle: 'Frist',
    text: 'Fristen und Wiedervorlagen. Ab 48h zwingend auf dem Dashboard.',
    icon: CalendarClock
  },
  {
    id: 'bem',
    title: 'BEM',
    shortTitle: 'BEM',
    text: 'Einladung, Zustimmung, Maßnahmen, Evaluation.',
    icon: HeartPulse
  },
  {
    id: 'prevention',
    title: 'Präventionsverfahren',
    shortTitle: 'Prävention',
    text: 'Frühzeitige Aktivierung nach § 167 Abs. 1 SGB IX.',
    icon: ShieldAlert
  },
  {
    id: 'equalization',
    title: 'Gleichstellung / GdB',
    shortTitle: 'Gleichstellung',
    text: 'Antrag, Sachstand, Bescheid, Widerspruchsfrist.',
    icon: Scale
  },
  {
    id: 'termination',
    title: 'Kündigungsanhörung',
    shortTitle: 'Kündigung',
    text: 'Kritischer Workflow für SBV-Anhörung und Integrationsamt-Prüfung.',
    icon: ShieldAlert,
    status: 'planned',
    plannedVersion: '0.5.x'
  },
  {
    id: 'templates',
    title: 'Vorlagen',
    shortTitle: 'Vorlagen',
    text: 'Schriftverkehr, Platzhalter, Standardschreiben.',
    icon: FileText
  },
  {
    id: 'knowledge',
    title: 'Wissen',
    shortTitle: 'Wissen',
    text: 'Normen, Notizen, Fallverknüpfungen.',
    icon: BookOpen
  },
  {
    id: 'contacts',
    title: 'Kontakte',
    shortTitle: 'Kontakte',
    text: 'Inklusionsamt, Betriebsarzt, Agentur, Beratungsstellen.',
    icon: Users
  },
  {
    id: 'reports',
    title: 'Berichte',
    shortTitle: 'Berichte',
    text: 'Anonymisierte Tätigkeitsberichte und Auswertungen.',
    icon: BarChart3
  },
  {
    id: 'portable',
    title: 'Portabilität',
    shortTitle: 'USB',
    text: 'Datenpfad, Backup, tragbarer Betrieb.',
    icon: HardDrive,
    status: 'planned',
    plannedVersion: '0.6.x'
  }
];
