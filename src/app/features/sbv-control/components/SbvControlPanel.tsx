import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { ToolbarButton } from '../../../shared/components/IndustrialButton';
import { IndustrialPanel } from '../../../shared/components/WorkbenchLayout';

export function SbvControlPanel({
  kicker,
  title,
  actionLabel,
  onAction,
  actions,
  children,
}: {
  kicker: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <IndustrialPanel
      className="sbv-control-panel"
      kicker={kicker}
      title={title}
      actions={
        actions ?? (actionLabel && onAction ? (
          <ToolbarButton onClick={onAction}>
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </ToolbarButton>
        ) : undefined)
      }
    >
      {children}
    </IndustrialPanel>
  );
}
