import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("process template build regression", () => {
  it("declares process status state for template creation", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("newTemplateProcessStatus");
    expect(app).toContain("setNewTemplateProcessStatus");
    expect(app).toContain("useState<PreventionStatus | ''>");
  });

  it("casts template render bridge through unknown to satisfy TypeScript", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("bridge.templates.render as unknown as");
  });

  it("keeps the polished process template overlay", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("process-template-empty");
    expect(app).toContain("Benötigte Tags");
  });
});
