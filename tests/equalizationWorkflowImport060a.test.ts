import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.6.0a equalization workflow import fix", () => {
  it("imports UpdateEqualizationProcessInput where updateCaseEqualizationProcess uses it", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("UpdateEqualizationProcessInput");
    expect(workflow).toContain("from './core/models/equalization.model'");
    expect(workflow).toContain("async function updateCaseEqualizationProcess");
  });
});
