import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("template default settings", () => {
  it("adds a settings form for general template placeholders", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("TemplateDefaultSettingsForm");
    expect(app).toContain("Vorlagen & Standardwerte");
    expect(app).toContain("{{sbv.name}}");
    expect(app).toContain("{{arbeitgeber.ansprechpartner}}");
  });

  it("merges default values before concrete process values", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("const defaultValues = await loadTemplateDefaultValues()");
    expect(app).toContain("...defaultValues");
    expect(app).toContain("...buildProcessTemplateValues");
  });

  it("imports dedicated styles for template defaults", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const css = readFileSync("src/app/templateDefaults.css", "utf8");
    expect(app).toContain("import './templateDefaults.css';");
    expect(css).toContain(".template-default-settings");
    expect(css).toContain(".template-default-grid");
  });
});
