import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("process template overlay polish", () => {
  it("uses a structured empty state instead of a cramped tag sentence", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("process-template-empty");
    expect(app).toContain("Benötigte Tags");
    expect(app).toContain("massnahme:prevention");
    expect(app).not.toContain("Lege im Vorlagenmodul eine Präventionsvorlage mit Tags wie <strong>massnahme:prevention</strong>");
  });

  it("styles template tags as separate readable chips", () => {
    const css = readFileSync("src/app/caseWorkbench.css", "utf8");
    expect(css).toContain(".process-template-hint code");
    expect(css).toContain("white-space: nowrap");
    expect(css).toContain(".process-template-empty-note");
    expect(css).toContain(".process-template-tag");
  });
});
