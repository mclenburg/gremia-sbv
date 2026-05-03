import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("template process status state", () => {
  it("declares newTemplateProcessStatus inside TemplatesView", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const templatesViewStart = app.indexOf("function TemplatesView");
    const createOwnTemplateStart = app.indexOf("async function createOwnTemplate", templatesViewStart);
    const stateDeclaration = app.indexOf("const [newTemplateProcessStatus, setNewTemplateProcessStatus] = useState<PreventionStatus | ''>('');", templatesViewStart);

    expect(templatesViewStart).toBeGreaterThan(-1);
    expect(stateDeclaration).toBeGreaterThan(templatesViewStart);
    expect(stateDeclaration).toBeLessThan(createOwnTemplateStart);
  });

  it("keeps the render bridge TypeScript cast stable", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("bridge.templates.render as unknown as");
  });
});
