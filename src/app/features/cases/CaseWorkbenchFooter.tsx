import {
  CalendarPlus,
  FileText,
  Gavel,
  HeartPulse,
  Plus,
  Scale,
  ShieldCheck,
  type LucideIcon,
  Workflow,
  Wrench
} from 'lucide-react';
import type { CaseProcessType } from './caseWorkbenchTypes';

type FooterAction = {
  key: string;
  icon: LucideIcon;
  label: string;
  detail: string;
  onClick: () => void;
  variant: 'primary' | 'secondary';
};

function ActionLabel({ label, detail }: { label: string; detail: string }) {
  return (
    <span className="case-workbench-footer-action-label">
      <strong>{label}</strong>
      <small>{detail}</small>
    </span>
  );
}

function FooterActionButton({ action, disabled }: { action: FooterAction; disabled: boolean }) {
  const Icon = action.icon;
  const className = action.variant === 'primary'
    ? 'industrial-button case-workbench-footer-button'
    : 'industrial-secondary-button case-workbench-footer-button case-workbench-footer-button-secondary';

  return (
    <button type="button" className={className} disabled={disabled} onClick={action.onClick}>
      <Icon className="h-4 w-4" />
      <ActionLabel label={action.label} detail={action.detail} />
    </button>
  );
}

export function CaseWorkbenchFooter({
  disabled,
  onNewNote,
  onImportDocument,
  onDeadline,
  onProcess
}: {
  disabled: boolean;
  onNewNote: () => void;
  onImportDocument: () => void;
  onDeadline: () => void;
  onProcess: (type: CaseProcessType) => void;
}) {
  const quickActions: FooterAction[] = [
    {
      key: 'note',
      icon: Plus,
      label: 'Notiz / Protokoll',
      detail: 'Gespräch oder Verlauf erfassen',
      onClick: onNewNote,
      variant: 'primary'
    },
    {
      key: 'document',
      icon: FileText,
      label: 'Dokument',
      detail: 'Datei zur Fallakte importieren',
      onClick: onImportDocument,
      variant: 'primary'
    },
    {
      key: 'deadline',
      icon: CalendarPlus,
      label: 'Frist',
      detail: 'Frist oder Wiedervorlage anlegen',
      onClick: onDeadline,
      variant: 'primary'
    }
  ];

  const measureActions: FooterAction[] = [
    {
      key: 'prevention',
      icon: Workflow,
      label: 'Prävention',
      detail: 'Präventionsverfahren erfassen',
      onClick: () => onProcess('prevention'),
      variant: 'secondary'
    },
    {
      key: 'bem',
      icon: HeartPulse,
      label: 'BEM',
      detail: 'BEM-Maßnahme anlegen',
      onClick: () => onProcess('bem'),
      variant: 'secondary'
    },
    {
      key: 'participation',
      icon: ShieldCheck,
      label: 'Beteiligung',
      detail: 'SBV-Beteiligung dokumentieren',
      onClick: () => onProcess('participation'),
      variant: 'secondary'
    },
    {
      key: 'workplace',
      icon: Wrench,
      label: 'Arbeitsplatz',
      detail: 'Arbeitsplatzgestaltung festhalten',
      onClick: () => onProcess('workplace_accommodation'),
      variant: 'secondary'
    },
    {
      key: 'termination',
      icon: Gavel,
      label: 'Kündigung',
      detail: 'Kündigungsanhörung anlegen',
      onClick: () => onProcess('termination_hearing'),
      variant: 'secondary'
    },
    {
      key: 'equalization',
      icon: Scale,
      label: 'Gleichstellung',
      detail: 'Antrag oder Verfahren erfassen',
      onClick: () => onProcess('equalization'),
      variant: 'secondary'
    }
  ];

  return (
    <footer className="case-workbench-footer" aria-label="Neue Akteneinträge">
      <section className="case-workbench-footer-section" aria-labelledby="case-workbench-quick-actions-heading">
        <div className="case-workbench-footer-heading">
          <span id="case-workbench-quick-actions-heading">Schnellerfassung</span>
          <small>Direkt in die Fallakte schreiben oder eine Frist setzen.</small>
        </div>
        <div className="case-workbench-footer-actions case-workbench-footer-actions-primary">
          {quickActions.map((action) => (
            <FooterActionButton key={action.key} action={action} disabled={disabled} />
          ))}
        </div>
      </section>

      <section className="case-workbench-footer-section" aria-labelledby="case-workbench-measures-heading">
        <div className="case-workbench-footer-heading">
          <span id="case-workbench-measures-heading">Maßnahmen</span>
          <small>Fachliche Vorgänge strukturiert aus der Fallakte heraus anlegen.</small>
        </div>
        <div className="case-workbench-footer-actions case-workbench-footer-actions-secondary">
          {measureActions.map((action) => (
            <FooterActionButton key={action.key} action={action} disabled={disabled} />
          ))}
        </div>
      </section>
    </footer>
  );
}
