import { useRef, useState, type ReactNode } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { IconButton, GhostButton } from '../components/IndustrialButton';
import { IndustrialModal } from '../dialogs/IndustrialDialogs';
import { getHelpEntry, type HelpRegistryId } from './helpRegistry';

type IndustrialHelpButtonProps = {
  helpId: HelpRegistryId;
  label?: string;
  className?: string;
};

function renderHelpBlock(block: ReturnType<typeof getHelpEntry>['blocks'][number]): ReactNode {
  if (block.type === 'list') {
    return (
      <ul className="industrial-help-list">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return <p>{block.text}</p>;
}

export function IndustrialHelpButton({ helpId, label = 'Hilfe öffnen', className }: IndustrialHelpButtonProps) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const entry = getHelpEntry(helpId);

  return (
    <>
      <IconButton
        type="button"
        className={className ? `industrial-help-button ${className}` : 'industrial-help-button'}
        aria-label={label}
        title={entry.title}
        data-help-title={entry.title}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        data-e2e="industrial-help-button"
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
      </IconButton>
      {open ? (
        <IndustrialModal
          title={entry.title}
          kicker={entry.kicker ?? 'Hilfe'}
          description={entry.summary}
          onClose={() => setOpen(false)}
          initialFocusRef={closeButtonRef}
          className="industrial-help-dialog"
          dataE2e="industrial-help-dialog"
          actions={
            <GhostButton type="button" ref={closeButtonRef} onClick={() => setOpen(false)}>
              Schließen
            </GhostButton>
          }
        >
          <div className="industrial-help-dialog-body">
            {entry.blocks.map((block, index) => (
              <div key={`${entry.id}-block-${index}`} className="industrial-help-block">
                {renderHelpBlock(block)}
              </div>
            ))}
          </div>
        </IndustrialModal>
      ) : null}
    </>
  );
}

export function IndustrialHelpInline({ helpId, children }: { helpId: HelpRegistryId; children: ReactNode }) {
  return (
    <span className="industrial-help-inline">
      <span>{children}</span>
      <IndustrialHelpButton helpId={helpId} label="Bereichshilfe öffnen" />
    </span>
  );
}
