import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("process template build regression", () => {
  it("declares process status state for template creation", () => {
    const view = readFileSync("src/app/features/templates/TemplatesView.tsx", "utf8");
    expect(view).toContain("newTemplateProcessStatus");
    expect(view).toContain("setNewTemplateProcessStatus");
    expect(view).toContain("useState<PreventionStatus | ''>");
  });

  it("casts template render bridge through unknown to satisfy TypeScript", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("bridge.templates.render as unknown as");
  });

  it("keeps the polished process template overlay", () => {
    const modal = readFileSync("src/app/features/cases/ProcessTemplateDocumentsModal.tsx", "utf8");
    expect(modal).toContain("process-template-empty");
    expect(modal).toContain("Benötigte Tags");
  });
});
