import type { IpcInvoker } from "./invoke.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
import type {
  CreateTemplateInput,
  RenderContextTemplateInput,
  RenderTemplateInput,
  RenderedTemplateResult,
  TemplateListFilters,
  TemplateRecord,
  UpdateTemplateInput,
} from "../../src/app/core/models/template.model.js";

export function createTemplatesApi(invokeIpc: IpcInvoker) {
  return {
  templates: {
      list: (filters?: TemplateListFilters): Promise<TemplateRecord[]> =>
        invokeIpc(IPC_CHANNELS.templatesList, filters),
      create: (input: CreateTemplateInput): Promise<TemplateRecord> =>
        invokeIpc(IPC_CHANNELS.templatesCreate, input),
      update: (id: string, input: UpdateTemplateInput): Promise<TemplateRecord> =>
        invokeIpc(IPC_CHANNELS.templatesUpdate, id, input),
      delete: (id: string): Promise<{ deleted: boolean }> =>
        invokeIpc(IPC_CHANNELS.templatesDelete, id),
      render: (input: RenderTemplateInput): Promise<RenderedTemplateResult> =>
        invokeIpc(IPC_CHANNELS.templatesRender, input),
      renderContext: (
        input: RenderContextTemplateInput,
      ): Promise<RenderedTemplateResult> =>
        invokeIpc(IPC_CHANNELS.templatesRenderContext, input),
    }
  } as const;
}
