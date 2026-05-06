import type { ReactNode } from "react";

type CasesViewLayoutProps = {
  register: ReactNode;
  workbench: ReactNode;
};

export function CasesViewLayout({ register, workbench }: CasesViewLayoutProps) {
  return (
    <div className="case-workbench-grid">
      {register}
      {workbench}
    </div>
  );
}
