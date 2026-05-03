import type { ReactNode } from 'react';

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
  return (
    <main className="module-frame">
      <section className={`industrial-hero ${compact ? 'industrial-hero-compact' : ''}`}>
        <div>
          {kicker ? <p className="industrial-kicker">{kicker}</p> : null}
          {title ? <h1>{title}</h1> : null}
          {description ? <p>{description}</p> : null}
        </div>
      </section>
      {children}
    </main>
  );
}
