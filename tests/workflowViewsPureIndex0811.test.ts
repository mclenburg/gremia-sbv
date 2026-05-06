import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

describe("0.8.11 workflowViews pure index", () => {
  it("keeps workflowViews as import/re-export orchestration only", () => {
    expect(workflow).toContain('from "./features/cases/CasesView"');
    expect(workflow).toContain("export {");
    expect(workflow).toContain("export type");
    expect(workflow).not.toMatch(/function\s+\w+/);
    expect(workflow).not.toContain("useState");
    expect(workflow).not.toContain("useEffect");
    expect(workflow).not.toContain("return (");
  });
});
