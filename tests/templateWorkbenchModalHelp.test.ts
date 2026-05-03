import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("template workbench modal and help", () => {
  it("opens template creation through a modal instead of a permanent page form", () => {
    const view = readFileSync("src/app/features/templates/TemplatesView.tsx", "utf8");
    expect(view).toContain("isCreateTemplateModalOpen");
    expect(view).toContain("setIsCreateTemplateModalOpen(true)");
    expect(view).toContain("template-create-modal");
  });

  it("contains a placeholder help overlay reachable from the catalog header", () => {
    const view = readFileSync("src/app/features/templates/TemplatesView.tsx", "utf8");
    expect(view).toContain("isTemplateHelpOpen");
    expect(view).toContain("template-help-button");
    expect(view).toContain("template-placeholder-help");
    expect(view).toContain("{{fall.aktenzeichen}}");
    expect(view).toContain("{{praevention.status}}");
  });

  it("loads template workbench styles", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const css = readFileSync("src/app/templateWorkbench.css", "utf8");
    expect(app).toContain("import './templateWorkbench.css';");
    expect(css).toContain(".template-filter-form");
    expect(css).toContain(".template-create-modal");
    expect(css).toContain(".template-help-modal");
  });
});
