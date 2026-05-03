import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("template default settings", () => {
  it("adds a settings form for general template placeholders", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("TemplateDefaultSettingsForm");
    expect(workflow).toContain("Vorlagen & Standardwerte");
    expect(workflow).toContain("{{sbv.name}}");
    expect(workflow).toContain("{{arbeitgeber.ansprechpartner}}");
  });

  it("merges default values before concrete process values", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("const defaultValues = await loadTemplateDefaultValues()");
    expect(workflow).toContain("...defaultValues");
    expect(workflow).toContain("...buildProcessTemplateValues");
  });

  it("imports dedicated styles for template defaults", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const css = readFileSync("src/app/templateDefaults.css", "utf8");
    expect(app).toContain("import './templateDefaults.css';");
    expect(css).toContain(".template-default-settings");
    expect(css).toContain(".template-default-grid");
  });
});
