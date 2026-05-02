import type { ReactNode } from 'react';

interface ModuleFrameProps {
  title: string;
  kicker: string;
  description: string;
  children: ReactNode;
}

export function ModuleFrame({ title, kicker, description, children }: ModuleFrameProps) {
  return (
    <section className="space-y-6">
      <header className="industrial-module-header">
        <div>
          <p className="industrial-kicker">{kicker}</p>
          <h1 className="industrial-title">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
