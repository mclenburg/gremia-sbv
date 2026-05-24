import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { ToolbarButton } from '../../../shared/components/IndustrialButton';
import { IndustrialPanel } from '../../../shared/components/WorkbenchLayout';

export function SbvControlPanel({
  icon,
  kicker,
  title,
  actionLabel,
  onAction,
  children,
}: {
  icon: ReactNode;
  kicker: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <IndustrialPanel
      className="sbv-control-panel"
      kicker={kicker}
      title={title}
      actions={
        actionLabel && onAction ? (
          <ToolbarButton onClick={onAction}>
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </ToolbarButton>
        ) : undefined
      }
    >
      <span className="sbv-control-panel-icon" aria-hidden="true">
        {icon}
      </span>
      {children}
    </IndustrialPanel>
  );
}
