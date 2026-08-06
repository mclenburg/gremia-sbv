import type { IpcInvoker } from "./invoke.js";
import { createWorkflowsApi } from "./compliance-workflows.js";
import { createGovernanceApi } from "./compliance-governance.js";
import { createPrivacyApi } from "./compliance-privacy.js";

export function createComplianceApi(invokeIpc: IpcInvoker) {
  return {
    ...createWorkflowsApi(invokeIpc),
    ...createGovernanceApi(invokeIpc),
    ...createPrivacyApi(invokeIpc),
  } as const;
}
