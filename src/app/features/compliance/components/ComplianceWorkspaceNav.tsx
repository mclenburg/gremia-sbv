import { WorkbenchNavigation } from "../../../shared/components/WorkbenchLayout";
import { WORKSPACES, type ComplianceWorkspace } from "../complianceConstants";

export function ComplianceWorkspaceNav({
  active,
  onChange,
}: {
  active: ComplianceWorkspace;
  onChange: (id: ComplianceWorkspace) => void;
}) {
  return (
    <WorkbenchNavigation
      items={WORKSPACES}
      active={active}
      onChange={onChange}
      ariaLabel="Compliance-Arbeitsbereiche"
    />
  );
}
