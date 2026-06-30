import { useId, type ReactNode } from 'react';
import { IndustrialHelpButton } from '../help/IndustrialHelp';
import type { HelpRegistryId } from '../help/helpRegistry';

type ModuleFrameProps = {
  title?: string;
  kicker?: string;
  description?: string;
  helpId?: HelpRegistryId;
  compact?: boolean;
  children: ReactNode;
};

export function ModuleFrame({
  title,
  kicker,
  description,
  helpId,
  compact = false,
  children
}: ModuleFrameProps) {
  const titleId = useId();

  return (
    <section className="module-frame" aria-labelledby={title ? titleId : undefined}>
      <div className={`industrial-hero ${compact ? 'industrial-hero-compact' : ''}`}>
        <div>
          {kicker ? <p className="industrial-kicker">{kicker}</p> : null}
          {title ? (
            <div className="industrial-section-title-row">
              <h1 id={titleId}>{title}</h1>
              {helpId ? <IndustrialHelpButton helpId={helpId} label="Bereichshilfe öffnen" /> : null}
            </div>
          ) : helpId ? (
            <IndustrialHelpButton helpId={helpId} label="Bereichshilfe öffnen" />
          ) : null}
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
