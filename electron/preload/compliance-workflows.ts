import type { IpcInvoker } from "./invoke.js";
import { createKnowledgeApi } from "./compliance-knowledge.js";
import { createProcessesApi } from "./compliance-processes.js";

export function createWorkflowsApi(invokeIpc: IpcInvoker) {
  return { ...createKnowledgeApi(invokeIpc), ...createProcessesApi(invokeIpc) } as const;
}
