import { useId, type ReactNode } from 'react';

type ModuleFrameProps = {
  title?: string;
  kicker?: string;
  description?: string;
  compact?: boolean;
  children: ReactNode;
};

export function ModuleFrame({
  title,
  kicker,
  description,
  compact = false,
  children
}: ModuleFrameProps) {
  const titleId = useId();

  return (
    <section className="module-frame" aria-labelledby={title ? titleId : undefined}>
      <div className={`industrial-hero ${compact ? 'industrial-hero-compact' : ''}`}>
        <div>
          {kicker ? <p className="industrial-kicker">{kicker}</p> : null}
          {title ? <h1 id={titleId}>{title}</h1> : null}
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
