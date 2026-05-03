import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("template process status state", () => {
  it("declares newTemplateProcessStatus inside TemplatesView", () => {
    const view = readFileSync("src/app/features/templates/TemplatesView.tsx", "utf8");
    const templatesViewStart = view.indexOf("export function TemplatesView");
    const createOwnTemplateStart = view.indexOf("async function createOwnTemplate", templatesViewStart);
    const stateDeclaration = view.indexOf("const [newTemplateProcessStatus, setNewTemplateProcessStatus] = useState<PreventionStatus | ''>('');", templatesViewStart);
    expect(templatesViewStart).toBeGreaterThan(-1);
    expect(stateDeclaration).toBeGreaterThan(templatesViewStart);
    expect(stateDeclaration).toBeLessThan(createOwnTemplateStart);
  });

  it("keeps the render bridge TypeScript cast stable", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("bridge.templates.render as unknown as");
  });
});
