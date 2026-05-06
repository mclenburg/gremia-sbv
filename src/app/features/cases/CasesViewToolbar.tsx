import type { ReactNode } from "react";

type CasesViewToolbarProps = {
  children: ReactNode;
};

export function CasesViewToolbar({ children }: CasesViewToolbarProps) {
  return <div className="case-workbench-toolbar">{children}</div>;
}
