import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return listSourceFiles(path);
    return /\.(ts|tsx)$/.test(path) ? [path] : [];
  });
}

describe("0.8.11 workflowViews logic boundary", () => {
  it("does not leave handlers, hooks or JSX render logic in workflowViews", () => {
    expect(workflow).not.toMatch(/\bconst\s+\w+\s*=\s*\(/);
    expect(workflow).not.toContain("async function");
    expect(workflow).not.toContain("<ModuleFrame");
    expect(workflow).not.toContain("<CaseDetailPanel");
    expect(workflow).not.toContain("waitForBridge");
  });

  it("keeps feature modules from importing workflowViews and creating cycles", () => {
    const offenders = listSourceFiles("src/app/features").filter((file) =>
      readFileSync(file, "utf8").includes("workflowViews"),
    );
    expect(offenders).toEqual([]);
  });
});
