import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.4.44 TemplatesView extraction", () => {
  it("moves TemplatesView into the templates feature module", () => {
    expect(existsSync("src/app/features/templates/TemplatesView.tsx")).toBe(true);
    const feature = readFileSync("src/app/features/templates/TemplatesView.tsx", "utf8");
    expect(feature).toContain("export function TemplatesView()");
    expect(feature).toContain("Vorlagenkatalog");
    expect(feature).toContain("Vorlage bearbeiten");
  });

  it("removes TemplatesView from workflowViews", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).not.toContain("export function TemplatesView");
    expect(workflow).not.toContain("const templateCategoryLabels");
  });

  it("imports TemplatesView directly in App", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("import { TemplatesView } from './features/templates/TemplatesView';");
    expect(app).not.toContain("TemplatesView,\n  waitForBridge");
    expect(app).toContain("{currentView === 'templates' && <TemplatesView />}");
  });

  it("keeps the template administration page free of draft-generation leftovers", () => {
    const feature = readFileSync("src/app/features/templates/TemplatesView.tsx", "utf8");
    expect(feature).not.toContain("renderSelectedTemplate");
    expect(feature).not.toContain("copyRenderedText");
    expect(feature).not.toContain("selectedCaseId");
  });
});
